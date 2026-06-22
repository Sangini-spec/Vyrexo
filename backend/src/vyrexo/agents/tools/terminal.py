"""
Terminal Tools — Execute shell commands on the developer's machine.

Provides safe command execution with timeout, output capture, and
working directory management.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

import structlog

logger = structlog.get_logger()


def humanize_command(command: str) -> str:
    """Plain-English description of what a shell command is DOING, for narration.

    The Code tab still shows the exact command; this is what Rex SAYS out loud, so
    he sounds like a teammate ("Installing the packages it needs") instead of
    reading "pip install -r requirements.txt".
    """
    c = (command or "").strip().lower()
    pairs = [
        (("pip install", "pip3 install", "poetry add", "poetry install", "npm install", "npm i ", "yarn add", "yarn install", "pnpm install", "pip install -r"),
         "Installing the packages it needs."),
        (("python -m venv", "virtualenv", "py -m venv", "conda create"),
         "Setting up a fresh environment for the project."),
        (("pytest", "python -m pytest", "npm test", "npm run test", "jest", "vitest", "go test", "cargo test", "unittest"),
         "Running the tests to make sure it works."),
        (("uvicorn", "flask run", "npm run dev", "npm start", "yarn dev", "next dev", "manage.py runserver", "rails server"),
         "Starting up the app."),
        (("rm ", "rm -rf", "rmdir", "del ", "remove-item", "unlink"),
         "Cleaning up some old files."),
        (("mkdir", "new-item", "md "),
         "Creating the project folders."),
        (("git commit",), "Saving the changes."),
        (("git push",), "Pushing the code up."),
        (("git add", "git stage"), "Staging the changes."),
        (("git clone",), "Grabbing the code."),
        (("git init",), "Starting version control."),
        (("git pull", "git fetch"), "Pulling the latest code."),
        (("npm run build", "yarn build", "next build", "tsc", "webpack", "vite build", "make"),
         "Building the project."),
        (("python ", "python3 ", "py ", "node ", "ts-node", "bun "),
         "Running the app."),
        (("curl", "wget", "http"), "Checking it responds."),
        (("ls", "dir", "tree", "cat", "type ", "find ", "grep"), "Taking a look at the files."),
    ]
    for needles, phrase in pairs:
        if any(n in c for n in needles):
            return phrase
    return "Running a quick command to set things up."


async def _terminate_tree(process: asyncio.subprocess.Process) -> None:
    """Kill a process AND its children, then reap it without hanging.

    The previous code did ``process.kill()`` + ``await process.communicate()``.
    On Windows that kills only the shell, not its children (e.g. a Flask dev
    server and its reloader subprocess), and the leftover children keep the
    stdout/stderr pipes open — so ``communicate()`` blocks forever and wedges
    the whole agent pipeline. We kill the full tree and reap with a timeout so
    this can never hang again.
    """
    pid = process.pid
    try:
        if sys.platform == "win32":
            # /T kills the entire tree, /F forces it.
            killer = await asyncio.create_subprocess_exec(
                "taskkill", "/F", "/T", "/PID", str(pid),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await asyncio.wait_for(killer.wait(), timeout=10)
        else:
            try:
                process.kill()
            except ProcessLookupError:
                pass
    except Exception:
        logger.warning("terminal_kill_failed", pid=pid)
    # Reap the process itself (wait(), NOT communicate() — the latter reads the
    # pipes to EOF and can block on still-open child handles).
    try:
        await asyncio.wait_for(process.wait(), timeout=5)
    except Exception:
        pass

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
            await _terminate_tree(process)
            logger.info("terminal_timeout", command=command[:60], timeout=timeout)
            return {
                "command": command,
                "exit_code": -1,
                # A timeout often means the command is a long-running process
                # (e.g. a web server) that started fine and never exits on its
                # own — say so, so the agent reads it as "started" not "broken".
                "error": (
                    f"Command did not finish within {timeout}s and was stopped. "
                    "If this was a server or other long-running process, it "
                    "started successfully (it just doesn't exit on its own)."
                ),
                "stdout": "",
                "stderr": "",
                "success": False,
                "timed_out": True,
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
