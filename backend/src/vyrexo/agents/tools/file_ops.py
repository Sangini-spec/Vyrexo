"""
File Operations Tools — Read, write, create, list files on the developer's machine.

These are the tools the CodingAgent uses via Gemini function calling.
Every tool returns a dict that gets fed back to Gemini as tool output.
"""

from __future__ import annotations

import os
from pathlib import Path

import structlog

logger = structlog.get_logger()


def read_file(path: str, project_root: str = ".") -> dict:
    """Read a file's contents."""
    full_path = _resolve_path(path, project_root)

    if not full_path.exists():
        return {"error": f"File not found: {path}"}

    if not full_path.is_file():
        return {"error": f"Not a file: {path}"}

    try:
        content = full_path.read_text(encoding="utf-8")
        return {
            "path": str(full_path),
            "content": content,
            "size": len(content),
            "lines": content.count("\n") + 1,
        }
    except Exception as e:
        return {"error": f"Failed to read {path}: {e}"}


def write_file(path: str, content: str, project_root: str = ".") -> dict:
    """Write content to a file (creates parent directories if needed)."""
    full_path = _resolve_path(path, project_root)

    try:
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")
        logger.info("file_written", path=str(full_path), size=len(content))
        return {
            "path": str(full_path),
            "size": len(content),
            "lines": content.count("\n") + 1,
            "status": "written",
        }
    except Exception as e:
        return {"error": f"Failed to write {path}: {e}"}


def create_file(path: str, content: str = "", project_root: str = ".") -> dict:
    """Create a new file. Returns error if file already exists."""
    full_path = _resolve_path(path, project_root)

    if full_path.exists():
        return {"error": f"File already exists: {path}. Use write_file to overwrite."}

    return write_file(path, content, project_root)


def list_directory(path: str = ".", project_root: str = ".") -> dict:
    """List files and directories in a path."""
    full_path = _resolve_path(path, project_root)

    if not full_path.exists():
        return {"error": f"Directory not found: {path}"}

    if not full_path.is_dir():
        return {"error": f"Not a directory: {path}"}

    try:
        entries = []
        for entry in sorted(full_path.iterdir()):
            # Skip hidden files and common noise
            if entry.name.startswith(".") or entry.name in ("node_modules", "__pycache__", ".git", "venv", ".venv"):
                continue
            entries.append({
                "name": entry.name,
                "type": "directory" if entry.is_dir() else "file",
                "size": entry.stat().st_size if entry.is_file() else None,
            })

        return {
            "path": str(full_path),
            "entries": entries,
            "count": len(entries),
        }
    except Exception as e:
        return {"error": f"Failed to list {path}: {e}"}


def delete_file(path: str, project_root: str = ".") -> dict:
    """Delete a file."""
    full_path = _resolve_path(path, project_root)

    if not full_path.exists():
        return {"error": f"File not found: {path}"}

    if not full_path.is_file():
        return {"error": f"Not a file (use with caution): {path}"}

    try:
        full_path.unlink()
        logger.info("file_deleted", path=str(full_path))
        return {"path": str(full_path), "status": "deleted"}
    except Exception as e:
        return {"error": f"Failed to delete {path}: {e}"}


def _resolve_path(path: str, project_root: str) -> Path:
    """Resolve a path relative to the project root. Prevents directory traversal."""
    root = Path(project_root).resolve()
    resolved = (root / path).resolve()

    # Security: prevent escaping the project directory
    if not str(resolved).startswith(str(root)):
        raise ValueError(f"Path escapes project root: {path}")

    return resolved


# ── Tool definitions for Gemini function calling ─────────────────

FILE_TOOLS = [
    {
        "name": "read_file",
        "description": "Read the contents of a file. Returns the file content, size, and line count.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to project root"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": "Write content to a file. Creates parent directories if they don't exist. Overwrites existing files.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to project root"},
                "content": {"type": "string", "description": "The full content to write to the file"},
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "create_file",
        "description": "Create a new file. Fails if file already exists. Use write_file to overwrite.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to project root"},
                "content": {"type": "string", "description": "Initial content for the file"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "list_directory",
        "description": "List files and directories in a path. Skips hidden files, node_modules, __pycache__, etc.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Directory path relative to project root. Defaults to project root."},
            },
        },
    },
    {
        "name": "delete_file",
        "description": "Delete a file. Only works on files, not directories.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to project root"},
            },
            "required": ["path"],
        },
    },
]

# Map tool names to functions
FILE_TOOL_MAP = {
    "read_file": read_file,
    "write_file": write_file,
    "create_file": create_file,
    "list_directory": list_directory,
    "delete_file": delete_file,
}

# ── Curated subsets ──────────────────────────────────────────────
# Only the coder (gated behind plan-approval) gets the full set incl. delete.
# Other agents get a restricted set so they can never delete/overwrite a file on
# an ungated path. Enforced at BOTH layers: the schemas bound to the LLM AND the
# executable map, so a hallucinated tool name can't run a tool the agent lacks.
_READONLY_NAMES = {"read_file", "list_directory"}
_NO_DELETE_NAMES = {"read_file", "write_file", "create_file", "list_directory"}

READONLY_FILE_TOOLS = [t for t in FILE_TOOLS if t["name"] in _READONLY_NAMES]
READONLY_FILE_TOOL_MAP = {k: v for k, v in FILE_TOOL_MAP.items() if k in _READONLY_NAMES}

SAFE_FILE_TOOLS = [t for t in FILE_TOOLS if t["name"] in _NO_DELETE_NAMES]
SAFE_FILE_TOOL_MAP = {k: v for k, v in FILE_TOOL_MAP.items() if k in _NO_DELETE_NAMES}
