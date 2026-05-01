"""
Git Operations Tools — Version control through voice commands.

Wraps common git operations as tools for the ExecutionAgent.
"""

from __future__ import annotations

from vyrexo.agents.tools.terminal import run_command

import structlog

logger = structlog.get_logger()


async def git_status(working_dir: str = ".") -> dict:
    """Get the current git status."""
    result = await run_command("git status --porcelain", working_dir)
    if not result.get("success"):
        return result

    lines = result["stdout"].strip().split("\n") if result["stdout"].strip() else []
    return {
        "modified": [l[3:] for l in lines if l.startswith(" M")],
        "added": [l[3:] for l in lines if l.startswith("A ")],
        "untracked": [l[3:] for l in lines if l.startswith("??")],
        "deleted": [l[3:] for l in lines if l.startswith(" D")],
        "total_changes": len(lines),
        "raw": result["stdout"],
    }


async def git_add(files: str = ".", working_dir: str = ".") -> dict:
    """Stage files for commit."""
    return await run_command(f"git add {files}", working_dir)


async def git_commit(message: str, working_dir: str = ".") -> dict:
    """Create a git commit with the given message."""
    # Escape quotes in message
    safe_message = message.replace('"', '\\"')
    return await run_command(f'git commit -m "{safe_message}"', working_dir)


async def git_push(remote: str = "origin", branch: str = "", working_dir: str = ".") -> dict:
    """Push commits to remote."""
    cmd = f"git push {remote}"
    if branch:
        cmd += f" {branch}"
    return await run_command(cmd, working_dir)


async def git_branch(name: str = "", working_dir: str = ".") -> dict:
    """Create a new branch or list branches."""
    if name:
        return await run_command(f"git checkout -b {name}", working_dir)
    return await run_command("git branch -a", working_dir)


async def git_diff(working_dir: str = ".") -> dict:
    """Show the current diff."""
    result = await run_command("git diff", working_dir)
    return result


async def git_log(count: int = 5, working_dir: str = ".") -> dict:
    """Show recent commit history."""
    result = await run_command(
        f'git log --oneline -n {count} --format="%h %s (%cr)"', working_dir
    )
    return result


# ── Tool definitions for Gemini function calling ─────────────────

GIT_TOOLS = [
    {
        "name": "git_status",
        "description": "Get the current git status showing modified, added, untracked, and deleted files.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "git_add",
        "description": "Stage files for commit. Use '.' to stage all changes.",
        "parameters": {
            "type": "object",
            "properties": {
                "files": {"type": "string", "description": "Files to stage (e.g., '.' for all, or 'src/main.py')"},
            },
        },
    },
    {
        "name": "git_commit",
        "description": "Create a git commit with a descriptive message.",
        "parameters": {
            "type": "object",
            "properties": {
                "message": {"type": "string", "description": "The commit message"},
            },
            "required": ["message"],
        },
    },
    {
        "name": "git_push",
        "description": "Push commits to the remote repository.",
        "parameters": {
            "type": "object",
            "properties": {
                "remote": {"type": "string", "description": "Remote name (default: origin)"},
                "branch": {"type": "string", "description": "Branch name (optional)"},
            },
        },
    },
    {
        "name": "git_branch",
        "description": "Create a new git branch or list all branches. Leave name empty to list.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Branch name to create (empty to list branches)"},
            },
        },
    },
    {
        "name": "git_diff",
        "description": "Show the current unstaged changes as a diff.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "git_log",
        "description": "Show recent commit history.",
        "parameters": {
            "type": "object",
            "properties": {
                "count": {"type": "integer", "description": "Number of commits to show (default 5)"},
            },
        },
    },
]

GIT_TOOL_MAP = {
    "git_status": git_status,
    "git_add": git_add,
    "git_commit": git_commit,
    "git_push": git_push,
    "git_branch": git_branch,
    "git_diff": git_diff,
    "git_log": git_log,
}
