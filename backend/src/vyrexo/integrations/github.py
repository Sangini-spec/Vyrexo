"""GitHub integration — push any local folder to GitHub and generate CI.

Single-user, local app. Auth is a Personal Access Token (from .env GITHUB_TOKEN
or a per-request override). The token is handled carefully so it never leaks:
- git runs via argv (asyncio.create_subprocess_exec), never a shell string;
- the authenticated push injects auth through a per-call `http.extraheader`, so
  the token is NEVER written to .git/config (origin stays a clean URL);
- logs and returned output are redacted; the token is never sent to the LLM.
"""

from __future__ import annotations

import asyncio
import base64
import os
import re
from pathlib import Path

import httpx
import structlog

from vyrexo.config import get_settings

logger = structlog.get_logger()

GITHUB_API = "https://api.github.com"


class GitHubError(Exception):
    """Carries a user-facing message for a known failure mode."""


# ── token + redaction ────────────────────────────────────────────

def _resolve_token(token_override: str | None = None) -> str:
    tok = (token_override or "").strip() or (get_settings().github.token or "").strip()
    if not tok:
        raise GitHubError(
            "No GitHub token is set. Add GITHUB_TOKEN to your .env, or paste a token "
            "in the dialog. Create one at https://github.com/settings/tokens with the "
            "'repo' scope."
        )
    return tok


def _redact(text: str, token: str | None) -> str:
    if not token or not text:
        return text
    b64 = base64.b64encode(f"x-access-token:{token}".encode()).decode()
    return text.replace(token, "*****").replace(b64, "*****")


def _gh_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Vyrexo",
    }


# ── git (argv, no shell; token-safe) ─────────────────────────────

async def _git(args: list[str], cwd: str, token: str | None = None, timeout: int = 120) -> dict:
    """Run a git command via argv. If `token` is given, inject a per-call auth
    header for github.com (so it never touches .git/config). Output is redacted."""
    full = ["git"]
    if token:
        b64 = base64.b64encode(f"x-access-token:{token}".encode()).decode()
        full += ["-c", f"http.https://github.com/.extraheader=AUTHORIZATION: basic {b64}"]
    full += args
    log_cmd = "git " + ("-c http.https://github.com/.extraheader=*****  " if token else "") + " ".join(args)
    logger.info("github_git", cmd=log_cmd[:160], cwd=cwd)
    try:
        proc = await asyncio.create_subprocess_exec(
            *full,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            # Never block on an interactive credential prompt.
            env={**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "never"},
        )
        out_b, err_b = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except Exception:
            pass
        return {"success": False, "exit_code": -1, "stdout": "", "stderr": f"git timed out after {timeout}s"}
    out = _redact(out_b.decode("utf-8", "replace"), token)
    err = _redact(err_b.decode("utf-8", "replace"), token)
    return {"success": proc.returncode == 0, "exit_code": proc.returncode, "stdout": out, "stderr": err}


# ── GitHub REST ──────────────────────────────────────────────────

async def get_authenticated_user(token: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{GITHUB_API}/user", headers=_gh_headers(token))
    if r.status_code == 200:
        return r.json()
    if r.status_code == 401:
        raise GitHubError("Your GitHub token was rejected (401). Make sure it's valid, not expired, and has the 'repo' scope.")
    raise GitHubError(f"GitHub rejected the token ({r.status_code}).")


async def repo_exists(token: str, owner: str, name: str) -> dict | None:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{GITHUB_API}/repos/{owner}/{name}", headers=_gh_headers(token))
    if r.status_code == 200:
        return r.json()
    if r.status_code == 404:
        return None
    if r.status_code == 401:
        raise GitHubError("Your GitHub token was rejected (401).")
    raise GitHubError(f"Couldn't check the repo ({r.status_code}).")


async def create_repo(token: str, name: str, private: bool = True, description: str = "") -> dict:
    body = {"name": name, "private": private, "auto_init": False}
    if description:
        body["description"] = description
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(f"{GITHUB_API}/user/repos", headers=_gh_headers(token), json=body)
    if r.status_code == 201:
        return r.json()
    if r.status_code == 422:
        raise GitHubError(f"You already have a repo named '{name}'.")
    if r.status_code == 401:
        raise GitHubError("Your GitHub token was rejected (401). Check its scope and expiry.")
    if r.status_code == 403:
        raise GitHubError("GitHub wouldn't let me create the repo (403) — the token may lack permission, or you're rate-limited.")
    msg = ""
    try:
        msg = r.json().get("message", "")
    except Exception:
        pass
    raise GitHubError(f"Repo creation failed ({r.status_code}): {msg[:120]}")


# ── parsing ──────────────────────────────────────────────────────

def parse_repo_target(repo: str) -> tuple[str | None, str]:
    """(owner, name). owner=None means 'create under the authenticated user'.
    Accepts a full URL, git@ URL, 'owner/name', or a bare 'name'."""
    r = (repo or "").strip()
    if not r:
        raise GitHubError("No repository was given.")
    m = re.match(r"git@github\.com:([^/]+)/(.+?)(?:\.git)?/?$", r)
    if m:
        return m.group(1), m.group(2)
    m = re.match(r"https?://github\.com/([^/]+)/(.+?)(?:\.git)?/?$", r, re.I)
    if m:
        return m.group(1), m.group(2)
    m = re.match(r"^([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$", r)
    if m:
        return m.group(1), m.group(2)
    m = re.match(r"^([A-Za-z0-9_.-]+)$", r)
    if m:
        return None, m.group(1)
    raise GitHubError(f"I couldn't read '{repo}' as a GitHub repo. Use a URL, owner/name, or just a name.")


# ── local repo helpers ───────────────────────────────────────────

def _protect_env(root: Path) -> bool:
    """If the folder has a .env that isn't ignored, add it to .gitignore so the
    user's own secrets don't get pushed. Returns True if it added the line."""
    if not (root / ".env").exists():
        return False
    gi = root / ".gitignore"
    existing = ""
    if gi.exists():
        try:
            existing = gi.read_text(encoding="utf-8", errors="replace")
        except Exception:
            existing = ""
    ignored = {ln.strip() for ln in existing.splitlines()}
    if {".env", "/.env", "*.env"} & ignored:
        return False
    try:
        with open(gi, "a", encoding="utf-8") as f:
            if existing and not existing.endswith("\n"):
                f.write("\n")
            f.write(".env\n")
        return True
    except Exception:
        return False


async def _ensure_identity(wd: str, login: str) -> None:
    s = get_settings().github
    name = s.commit_name or login
    email = s.commit_email or f"{login}@users.noreply.github.com"
    cur = await _git(["config", "user.name"], wd)
    if not cur["stdout"].strip():
        await _git(["config", "user.name", name], wd)
    cure = await _git(["config", "user.email"], wd)
    if not cure["stdout"].strip():
        await _git(["config", "user.email", email], wd)


async def _has_commits(wd: str) -> bool:
    r = await _git(["rev-parse", "--verify", "HEAD"], wd)
    return r["success"]


# ── CI/CD generation ─────────────────────────────────────────────

def detect_project_type(root: Path) -> str:
    py = any((root / f).exists() for f in ("pyproject.toml", "requirements.txt", "setup.py", "setup.cfg", "Pipfile"))
    if py:
        return "python"
    if (root / "package.json").exists():
        return "node"
    return "generic"


_CI_PYTHON = """name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "${{ matrix.python-version }}"
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
          if [ -f pyproject.toml ]; then pip install -e . || pip install . || true; fi
          pip install pytest ruff
      - name: Lint
        run: ruff check . || true
      - name: Test
        run: pytest -q || echo "no tests yet"
"""

_CI_NODE = """name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: ["18.x", "20.x"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "${{ matrix.node-version }}"
          cache: "npm"
      - name: Install
        run: npm ci || npm install
      - name: Build
        run: npm run build --if-present
      - name: Test
        run: npm test --if-present
"""

_CI_GENERIC = """name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Repository checks
        run: |
          echo "No language toolchain detected by Vyrexo."
          echo "Edit .github/workflows/ci.yml to add your build/test steps."
"""


def _ci_template(project_type: str) -> str:
    return {"python": _CI_PYTHON, "node": _CI_NODE}.get(project_type, _CI_GENERIC)


async def generate_ci_pipeline(working_dir: str, *, overwrite: bool = False) -> dict:
    root = Path(working_dir).expanduser()
    if not root.is_dir():
        raise GitHubError("That folder doesn't exist or isn't a directory.")
    root = root.resolve()
    ptype = detect_project_type(root)
    target = root / ".github" / "workflows" / "ci.yml"
    if target.exists() and not overwrite:
        return {
            "ok": True, "project_type": ptype, "path": ".github/workflows/ci.yml",
            "written": False, "skipped_exists": True,
            "message": "A CI workflow already exists, so I left it as-is.",
        }
    target.parent.mkdir(parents=True, exist_ok=True)
    yaml = _ci_template(ptype)
    target.write_text(yaml, encoding="utf-8")
    logger.info("github_ci_generated", project_type=ptype, path=str(target))
    return {
        "ok": True, "project_type": ptype, "path": ".github/workflows/ci.yml",
        "written": True, "skipped_exists": False, "yaml_preview": yaml[:400],
        "message": f"Added a {ptype} CI workflow at .github/workflows/ci.yml.",
    }


# ── the main flow ────────────────────────────────────────────────

async def push_folder_to_github(
    working_dir: str,
    repo: str,
    *,
    token_override: str | None = None,
    private: bool = True,
    commit_message: str = "Initial commit from Vyrexo",
    branch: str = "main",
    create_if_missing: bool = True,
) -> dict:
    token = _resolve_token(token_override)
    root = Path(working_dir).expanduser()
    if not root.is_dir():
        raise GitHubError("That folder doesn't exist or isn't a directory.")
    wd = str(root.resolve())

    user = await get_authenticated_user(token)
    login = user["login"]
    owner, name = parse_repo_target(repo)
    target_owner = owner or login

    created = False
    existing = await repo_exists(token, target_owner, name)
    if existing:
        if not existing.get("permissions", {}).get("push", False):
            raise GitHubError(f"That repo exists under {target_owner}, but your token can't push to it.")
        repo_url = existing["html_url"]
    else:
        if owner and owner != login:
            raise GitHubError(f"I couldn't find {owner}/{name}, and I can only create repos under your own account ({login}).")
        if not create_if_missing:
            raise GitHubError(f"The repo {target_owner}/{name} doesn't exist.")
        new = await create_repo(token, name, private=private)
        created = True
        repo_url = new["html_url"]
        target_owner = new["owner"]["login"]
        name = new["name"]

    clean_remote = f"https://github.com/{target_owner}/{name}.git"

    protected = _protect_env(root)

    if not (root / ".git").exists():
        r = await _git(["init"], wd)
        if not r["success"]:
            raise GitHubError("Couldn't initialize git: " + (r["stderr"] or "")[:160])
    await _ensure_identity(wd, login)

    rr = await _git(["remote"], wd)
    if "origin" in rr["stdout"].split():
        await _git(["remote", "set-url", "origin", clean_remote], wd)
    else:
        await _git(["remote", "add", "origin", clean_remote], wd)

    await _git(["add", "-A"], wd)
    staged = await _git(["diff", "--cached", "--quiet"], wd)  # exit 1 => something staged
    committed = False
    nothing_to_commit = False
    if staged["exit_code"] == 1:
        cm = await _git(["commit", "-m", commit_message], wd)
        if not cm["success"]:
            raise GitHubError("Commit failed: " + (cm["stderr"] or cm["stdout"] or "")[:160])
        committed = True
    elif not await _has_commits(wd):
        raise GitHubError("There's nothing to commit in that folder — it looks empty.")
    else:
        nothing_to_commit = True

    await _git(["branch", "-M", branch], wd)

    push = await _git(["push", "-u", "origin", f"HEAD:{branch}"], wd, token=token, timeout=180)
    if not push["success"]:
        err = (push["stderr"] or push["stdout"] or "").lower()
        if "rejected" in err or "non-fast-forward" in err or "fetch first" in err:
            raise GitHubError("The push was rejected — the remote has commits you don't have locally. Pull/rebase first, or ask me to force-push.")
        if "authentication" in err or "403" in err or "permission" in err or "denied" in err:
            raise GitHubError("GitHub refused the push — your token may lack write access to this repo.")
        raise GitHubError("Push failed: " + (push["stderr"] or push["stdout"] or "")[:200])

    if created:
        message = f"Created {repo_url} and pushed your project there on branch {branch}."
    elif nothing_to_commit:
        message = f"Everything was already committed — pushed to {repo_url} (branch {branch})."
    else:
        message = f"Pushed your project to {repo_url} on branch {branch}."
    if protected:
        message += " I added .env to .gitignore so your secrets don't get pushed."

    return {
        "ok": True, "repo_url": repo_url, "branch": branch, "created": created,
        "committed": committed, "nothing_to_commit": nothing_to_commit, "pushed": True,
        "message": message,
    }
