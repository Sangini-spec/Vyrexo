"""
ExecutionAgent — Runs terminal commands, installs packages, manages project setup.

This agent handles non-code tasks: project initialization, dependency installation,
running scripts, starting servers, etc.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage

from vyrexo.agents.base import BaseAgent, ToolDefinition
from vyrexo.agents.llm_factory import create_llm
from vyrexo.agents.registry import AgentRegistry
from vyrexo.agents.tools.terminal import TERMINAL_TOOL_MAP, TERMINAL_TOOLS
from vyrexo.agents.tools.file_ops import FILE_TOOL_MAP, FILE_TOOLS
from vyrexo.agents.tools.git_ops import GIT_TOOL_MAP, GIT_TOOLS
from vyrexo.config import get_settings

logger = structlog.get_logger()

EXECUTOR_SYSTEM_PROMPT = """You are Rex, the friendly AI coding assistant in Vyrexo. You're warm, encouraging, and always positive.

Your job is to run terminal commands and manage project setup tasks. When narrating, be friendly — like "Setting things up for you!" or "Installing the packages you need, one sec!"

You have access to:
- run_command: Execute any shell command
- read_file / write_file / create_file / list_directory: File operations
- git_status / git_add / git_commit / git_push / git_branch / git_diff / git_log: Git operations

Common tasks you handle:
- Initialize projects (mkdir, git init, create virtualenvs)
- Install dependencies (pip install, npm install)
- Run build commands (npm run build, python setup.py)
- Start/stop development servers
- Git operations (commit, push, branch, etc.)

Rules:
1. Check the current state before making changes (list_directory, git_status)
2. Install dependencies one command at a time for clarity
3. Always verify commands succeeded by checking exit codes
4. If a command fails, report the error clearly

When done, summarize what you executed and the results."""

MAX_TOOL_ROUNDS = 10


@AgentRegistry.register
class ExecutionAgent(BaseAgent):
    name = "executor"
    description = "Runs terminal commands, installs packages, manages project setup"
    capabilities = ["command_execution", "package_management", "project_setup", "git_operations"]
    model_tier = "light"  # Uses Gemini Flash — simpler tasks

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        settings = get_settings()
        llm = create_llm(settings.llm, self.model_tier)

        plan = state.get("plan", [])
        current_step = state.get("current_step", 0)
        task_desc = plan[current_step]["description"] if current_step < len(plan) else "Execute commands"
        project_path = state.get("project_path", ".")

        logger.info("executor_executing", task=task_desc[:80])

        all_tools = TERMINAL_TOOLS + FILE_TOOLS + GIT_TOOLS
        all_tool_map = {**TERMINAL_TOOL_MAP, **FILE_TOOL_MAP, **GIT_TOOL_MAP}

        messages = [
            SystemMessage(content=EXECUTOR_SYSTEM_PROMPT),
            HumanMessage(content=f"Project directory: {project_path}\n\nTask: {task_desc}"),
        ]

        commands_run = []

        for round_num in range(MAX_TOOL_ROUNDS):
            response = await llm.ainvoke(messages, tools=all_tools)

            if not response.tool_calls:
                break

            tool_results = []
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = dict(tool_call["args"])

                logger.info("executor_tool_call", tool=tool_name)

                # Inject paths
                if tool_name in FILE_TOOL_MAP:
                    tool_args["project_root"] = project_path
                elif tool_name == "run_command":
                    tool_args["working_dir"] = project_path
                elif tool_name in GIT_TOOL_MAP:
                    tool_args["working_dir"] = project_path

                fn = all_tool_map.get(tool_name)
                if fn is None:
                    result = {"error": f"Unknown tool: {tool_name}"}
                elif asyncio.iscoroutinefunction(fn):
                    result = await fn(**tool_args)
                else:
                    result = fn(**tool_args)

                if tool_name == "run_command":
                    commands_run.append(tool_args.get("command", ""))

                tool_results.append({
                    "tool_call_id": tool_call.get("id", ""),
                    "name": tool_name,
                    "content": json.dumps(result),
                })

            messages.append(response)
            for tr in tool_results:
                messages.append(ToolMessage(
                    content=tr["content"],
                    tool_call_id=tr["tool_call_id"],
                    name=tr["name"],
                ))

        final_text = response.content if hasattr(response, "content") else "Execution completed."

        artifacts = state.get("artifacts", {})
        artifacts.setdefault("commands_run", []).extend(commands_run)
        state["artifacts"] = artifacts

        if current_step < len(plan):
            plan[current_step]["status"] = "completed"
            plan[current_step]["result"] = {
                "commands_run": commands_run,
                "summary": final_text[:300],
            }
            state["plan"] = plan

        state["final_response"] = final_text
        logger.info("executor_completed", commands=len(commands_run))

        return state

    def get_tools(self) -> list[ToolDefinition]:
        return [
            ToolDefinition(name=t["name"], description=t["description"], parameters=t["parameters"])
            for t in TERMINAL_TOOLS + GIT_TOOLS
        ]
