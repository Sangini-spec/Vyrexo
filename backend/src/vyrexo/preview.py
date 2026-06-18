"""Live preview — run a project's dev server as a PERSISTENT process and detect
its URL, so the frontend can show it in the Preview tab (Claude-Code / Replit
style).

Unlike the agent's ``run_command`` (which runs to completion under a timeout),
this keeps the server alive in the background, drains its output so the OS pipe
never blocks it, and parses the http://host:port URL the framework prints on
startup. One server per session; starting a new one stops the old one.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
from pathlib import Path

import structlog

from vyrexo.agents.tools.terminal import _terminate_tree

logger = structlog.get_logger()

# Matches the URL a dev server prints, e.g. "Running on http://127.0.0.1:5000".
_URL_RE = re.compile(r"https?://(?:127\.0\.0\.1|localhost|0\.0\.0\.0)(?::\d+)?", re.I)

# session_id -> {"proc": Process, "drain": Task}
_servers: dict[str, dict] = {}


def _read(p: Path, name: str) -> str:
    try:
        return (p / name).read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def detect_run_command(project_path: str) -> tuple[str | None, str]:
    """Figure out how to start this project. Returns (command, kind)."""
    p = Path(project_path)

    if (p / "manage.py").exists():
        return "python manage.py runserver", "django"

    # Plain Python entry points (Flask/generic). run.py first — it's the
    # conventional launcher — then app.py / main.py, sniffing for FastAPI.
    for entry in ("run.py", "app.py", "main.py"):
        if (p / entry).exists():
            body = _read(p, entry)
            module = entry[:-3]  # strip ".py"
            if "FastAPI" in body or "fastapi" in body:
                return f"python -m uvicorn {module}:app --port 8000", "fastapi"
            return f"python {entry}", "flask"

    if (p / "package.json").exists():
        try:
            scripts = json.loads(_read(p, "package.json")).get("scripts", {})
        except Exception:
            scripts = {}
        if "dev" in scripts:
            return "npm run dev", "node"
        if "start" in scripts:
            return "npm start", "node"

    return None, ""


def _normalize(url: str) -> str:
    url = url.rstrip("/")
    return url.replace("0.0.0.0", "localhost").replace("127.0.0.1", "localhost")


async def _drain(proc: asyncio.subprocess.Process, found: asyncio.Future, buf: list[str]) -> None:
    """Continuously read the server's output: capture a tail, and resolve
    ``found`` with the first URL we see. Draining forever keeps the OS pipe from
    filling up and blocking the server."""
    try:
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            text = line.decode("utf-8", errors="replace")
            buf.append(text)
            if len(buf) > 300:
                del buf[0]
            if not found.done():
                m = _URL_RE.search(text)
                if m:
                    found.set_result(_normalize(m.group(0)))
    except Exception:
        pass
    finally:
        if not found.done():
            found.set_result(None)


async def start_preview(session_id: str, project_path: str, timeout: float = 20.0) -> dict:
    """Start the project's dev server and return {ok, url, command} or {ok:False, error}."""
    await stop_preview(session_id)  # never run two at once

    command, kind = detect_run_command(project_path)
    if not command:
        return {"ok": False, "error": (
            "I couldn't find an obvious way to run this project — I look for run.py, "
            "app.py, main.py, manage.py, or a package.json dev script. Tell me how to "
            "start it and I'll do it."
        )}

    cwd = Path(project_path).resolve()
    if not cwd.exists():
        return {"ok": False, "error": "the project folder doesn't exist."}

    logger.info("preview_starting", command=command, cwd=str(cwd), kind=kind)
    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,  # merge so we read one stream
            cwd=str(cwd),
            env=env,
        )
    except Exception as e:
        return {"ok": False, "error": f"I couldn't launch it: {e}"}

    buf: list[str] = []
    found: asyncio.Future = asyncio.get_event_loop().create_future()
    drain = asyncio.create_task(_drain(proc, found, buf))
    _servers[session_id] = {"proc": proc, "drain": drain}

    try:
        url = await asyncio.wait_for(asyncio.shield(found), timeout)
    except asyncio.TimeoutError:
        url = None

    if url:
        logger.info("preview_ready", url=url, command=command)
        return {"ok": True, "url": url, "command": command, "kind": kind}

    # No URL parsed. If the process already died, it crashed on startup.
    if proc.returncode is not None:
        await stop_preview(session_id)
        tail = "".join(buf[-25:]).strip()
        return {"ok": False, "error": "it started but exited right away.", "output": tail}

    # Still running but we couldn't read a URL — fall back to the framework default.
    guess = {"django": "http://localhost:8000", "fastapi": "http://localhost:8000",
             "flask": "http://localhost:5000", "node": "http://localhost:3000"}.get(kind)
    if guess:
        logger.info("preview_ready_guessed", url=guess, command=command)
        return {"ok": True, "url": guess, "command": command, "kind": kind, "guessed": True}

    tail = "".join(buf[-25:]).strip()
    return {"ok": False, "error": "it's running but I couldn't detect its URL.", "output": tail}


async def stop_preview(session_id: str) -> bool:
    """Stop a session's running preview server (kills the whole process tree)."""
    entry = _servers.pop(session_id, None)
    if entry is None:
        return False
    drain = entry.get("drain")
    if drain is not None:
        drain.cancel()
    proc = entry.get("proc")
    if proc is not None and proc.returncode is None:
        await _terminate_tree(proc)
    logger.info("preview_stopped", session_id=session_id)
    return True


def is_running(session_id: str) -> bool:
    entry = _servers.get(session_id)
    return bool(entry and entry["proc"].returncode is None)


async def stop_all() -> None:
    """Stop every running preview (called on server shutdown)."""
    for sid in list(_servers.keys()):
        await stop_preview(sid)
