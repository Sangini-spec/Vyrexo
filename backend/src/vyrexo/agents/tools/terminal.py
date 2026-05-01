"""
Terminal Tools — Execute shell commands on the developer's machine.

Provides safe command execution with timeout, output capture, and
working directory management.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import structlog

logger = structlog.get_logger()

# Commands that are never allowed
BLOCKED_COMMANDS = {
    "rm -rf /", "rm -rf /*", "format", "mkfs",
    "dd if=", ":(){:|:&};:",
}

# Max output size to prevent memory issues
MAX_OUTPUT_SIZE = 50_000  # chars


async def run_command(
    command: str,
    working_dir: str = ".",
    timeout: int = 60,
) -> dict:
    """
    Execute a shell command and return its output.

    Runs in the project's working directory with a timeout.
    Captures both stdout and stderr.
    """
    # Security check
    for blocked in BLOCKED_COMMANDS:
        if blocked in command:
            return {"error": f"Command blocked for safety: {command}"}

    cwd = Path(working_dir).resolve()
    if not cwd.exists():
        return {"error": f"Working directory not found: {working_dir}"}

    logger.info("terminal_exec", command=command[:100], cwd=str(cwd))

    try:
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(cwd),
            env={**os.environ},
        )

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(), timeout=timeout
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.communicate()
            return {
                "command": command,
                "exit_code": -1,
                "error": f"Command timed out after {timeout}s",
                "stdout": "",
                "stderr": "",
            }

        stdout = stdout_bytes.decode("utf-8", errors="replace")[:MAX_OUTPUT_SIZE]
        stderr = stderr_bytes.decode("utf-8", errors="replace")[:MAX_OUTPUT_SIZE]

        result = {
            "command": command,
            "exit_code": process.returncode,
            "stdout": stdout,
            "stderr": stderr,
            "success": process.returncode == 0,
        }

        logger.info(
            "terminal_result",
            command=command[:60],
            exit_code=process.returncode,
            stdout_lines=stdout.count("\n"),
        )

        return result

    except Exception as e:
        return {
            "command": command,
            "exit_code": -1,
            "error": str(e),
            "stdout": "",
            "stderr": "",
        }


# ── Tool definitions for Gemini function calling ─────────────────

TERMINAL_TOOLS = [
    {
        "name": "run_command",
        "description": "Execute a shell command in the project directory. Returns stdout, stderr, and exit code. Use for installing packages, running scripts, starting servers, running tests, etc.",
        "parameters": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The shell command to execute (e.g., 'pip install fastapi', 'npm run build', 'python -m pytest')",
                },
                "timeout": {
                    "type": "integer",
                    "description": "Timeout in seconds (default 60, max 300)",
                },
            },
            "required": ["command"],
        },
    },
]

TERMINAL_TOOL_MAP = {
    "run_command": run_command,
}
