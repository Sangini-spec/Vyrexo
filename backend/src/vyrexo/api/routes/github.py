"""GitHub endpoints — push a folder to GitHub + generate CI. Thin wrappers over
the integrations.github service. Errors come back as {"ok": False, "error": msg}
(house style) so the frontend can show them directly."""

from __future__ import annotations

import structlog
from fastapi import APIRouter
from pydantic import BaseModel

from vyrexo.config import get_settings
from vyrexo.integrations import github as gh

router = APIRouter(prefix="/github", tags=["github"])
logger = structlog.get_logger()


class PushRequest(BaseModel):
    path: str
    repo: str
    token: str | None = None
    private: bool = True
    commit_message: str = "Initial commit from Vyrexo"
    generate_ci: bool = False


class GenerateCIRequest(BaseModel):
    path: str
    overwrite: bool = False


class TokenRequest(BaseModel):
    token: str


@router.get("/status")
async def github_status() -> dict:
    """Whether a token is configured server-side (so the UI can decide whether to
    prompt for one), plus the login it resolves to."""
    token = (get_settings().github.token or "").strip()
    if not token:
        return {"ok": True, "configured": False}
    try:
        user = await gh.get_authenticated_user(token)
        return {"ok": True, "configured": True, "login": user.get("login")}
    except gh.GitHubError as e:
        return {"ok": True, "configured": False, "error": str(e)}


@router.post("/validate-token")
async def validate_token(req: TokenRequest) -> dict:
    try:
        user = await gh.get_authenticated_user(req.token.strip())
        return {"ok": True, "login": user.get("login")}
    except gh.GitHubError as e:
        return {"ok": False, "error": str(e)}


@router.post("/generate-ci")
async def generate_ci(req: GenerateCIRequest) -> dict:
    try:
        return await gh.generate_ci_pipeline(req.path, overwrite=req.overwrite)
    except gh.GitHubError as e:
        return {"ok": False, "error": str(e)}
    except Exception as e:
        logger.exception("github_generate_ci_failed")
        return {"ok": False, "error": f"Couldn't generate CI: {str(e)[:160]}"}


@router.post("/push")
async def push(req: PushRequest) -> dict:
    try:
        ci_msg = ""
        if req.generate_ci:
            ci = await gh.generate_ci_pipeline(req.path, overwrite=False)
            if ci.get("written"):
                ci_msg = " " + ci.get("message", "")
        result = await gh.push_folder_to_github(
            req.path,
            req.repo,
            token_override=req.token,
            private=req.private,
            commit_message=req.commit_message,
        )
        if ci_msg:
            result["message"] = (result.get("message", "") + ci_msg).strip()
        return result
    except gh.GitHubError as e:
        return {"ok": False, "error": str(e)}
    except Exception as e:
        logger.exception("github_push_failed")
        return {"ok": False, "error": f"Push failed: {str(e)[:160]}"}
