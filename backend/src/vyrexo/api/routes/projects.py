"""Project management endpoints — load projects, open in VS Code, pick a folder."""

from __future__ import annotations

import asyncio
import sys

import structlog
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/projects", tags=["projects"])
logger = structlog.get_logger()


class ProjectLoadRequest(BaseModel):
    path: str


class VSCodeOpenRequest(BaseModel):
    path: str
    line: int | None = None


@router.post("/pick")
async def pick_folder() -> dict:
    """Open a native OS folder-picker dialog and return the selected path.

    The backend runs on the user's own machine, so we can pop a real folder
    chooser — far more reliable than asking them to type an absolute path
    (browsers can't expose it). Windows uses the .NET FolderBrowserDialog.
    """
    if sys.platform != "win32":
        return {"ok": False, "error": "Folder picker is only wired for Windows right now."}

    ps_script = (
        "Add-Type -AssemblyName System.Windows.Forms | Out-Null; "
        "$f = New-Object System.Windows.Forms.FolderBrowserDialog; "
        "$f.Description = 'Select your project folder for Rex'; "
        "$f.ShowNewFolderButton = $true; "
        "$top = New-Object System.Windows.Forms.Form; $top.TopMost = $true; "
        "if ($f.ShowDialog($top) -eq [System.Windows.Forms.DialogResult]::OK) "
        "{ [Console]::Out.Write($f.SelectedPath) }"
    )
    try:
        proc = await asyncio.create_subprocess_exec(
            "powershell", "-NoProfile", "-STA", "-Command", ps_script,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=180)
    except asyncio.TimeoutError:
        return {"ok": False, "error": "Folder picker timed out."}
    except Exception as e:
        logger.warning("folder_pick_failed", error=str(e)[:120])
        return {"ok": False, "error": "Could not open the folder picker."}

    path = stdout.decode("utf-8", errors="replace").strip()
    if not path:
        return {"ok": False, "cancelled": True}
    logger.info("folder_picked", path=path)
    return {"ok": True, "path": path}


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
