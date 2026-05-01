"""
VS Code Integration — Opens projects and files in VS Code.

Uses the `code` CLI command that comes with VS Code installation.
Works the same way Claude Code opens VS Code.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

import structlog

from vyrexo.agents.tools.terminal import run_command

logger = structlog.get_logger()


async def open_in_vscode(project_path: str) -> dict:
    """Open a project folder in VS Code."""
    path = Path(project_path).resolve()
    if not path.exists():
        return {"error": f"Path not found: {project_path}"}

    result = await run_command(f'code "{path}"', working_dir=str(path))

    if result.get("success") or result.get("exit_code") == 0:
        logger.info("vscode_opened", path=str(path))
        return {"status": "opened", "path": str(path)}
    else:
        return {"error": f"Failed to open VS Code: {result.get('stderr', '')}"}


async def open_file_in_vscode(file_path: str, line: int | None = None) -> dict:
    """Open a specific file in VS Code, optionally at a line number."""
    path = Path(file_path).resolve()
    if not path.exists():
        return {"error": f"File not found: {file_path}"}

    cmd = f'code "{path}"'
    if line:
        cmd = f'code --goto "{path}:{line}"'

    result = await run_command(cmd)

    if result.get("success") or result.get("exit_code") == 0:
        logger.info("vscode_file_opened", path=str(path), line=line)
        return {"status": "opened", "path": str(path), "line": line}
    else:
        return {"error": f"Failed to open file: {result.get('stderr', '')}"}


async def is_vscode_available() -> bool:
    """Check if the `code` CLI is available."""
    result = await run_command("code --version")
    return result.get("exit_code") == 0
