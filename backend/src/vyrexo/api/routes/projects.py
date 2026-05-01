"""Project management endpoints — load projects, open in VS Code."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectLoadRequest(BaseModel):
    path: str


class VSCodeOpenRequest(BaseModel):
    path: str
    line: int | None = None


@router.post("/load")
async def load_project(req: ProjectLoadRequest) -> dict:
    """Load a project directory — indexes codebase for context retrieval."""
    from vyrexo.main import context_engine

    if context_engine is None:
        return {"error": "Context engine not initialized"}

    stats = await context_engine.load_project(req.path)
    return stats


@router.post("/vscode")
async def open_vscode(req: VSCodeOpenRequest) -> dict:
    """Open a project or file in VS Code."""
    from vyrexo.integrations.vscode import open_file_in_vscode, open_in_vscode

    if req.line:
        return await open_file_in_vscode(req.path, req.line)
    return await open_in_vscode(req.path)


@router.get("/vscode/status")
async def vscode_status() -> dict:
    """Check if VS Code CLI is available."""
    from vyrexo.integrations.vscode import is_vscode_available

    available = await is_vscode_available()
    return {"available": available}
