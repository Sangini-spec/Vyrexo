"""
TestingAgent — Generates and runs test cases for the code.

Creates tests based on the implementation, runs them, and reports results.
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
from vyrexo.agents.tools.file_ops import FILE_TOOL_MAP, FILE_TOOLS
from vyrexo.agents.tools.terminal import TERMINAL_TOOL_MAP, TERMINAL_TOOLS
from vyrexo.config import get_settings

logger = structlog.get_logger()

TESTER_SYSTEM_PROMPT = """You are Rex, the friendly AI coding assistant in Vyrexo. You're thorough but encouraging — when tests pass you celebrate, when they fail you're supportive and helpful.

Your job is to generate and run tests for code that was just written. Narrate like: "Let me write some tests to make sure everything works perfectly!" or "Ooh, found a small issue — let me help fix that."

You have access to:
- read_file: Read existing files to understand what needs testing
- write_file / create_file: Create test files
- list_directory: See project structure
- run_command: Run test commands (pytest, npm test, etc.)

Rules:
1. First read the source files to understand what was implemented
2. Create comprehensive test files covering:
   - Happy path (normal usage)
   - Edge cases (empty inputs, invalid data)
   - Error handling (expected failures)
3. Use the project's existing test framework if detected, otherwise:
   - Python: use pytest
   - JavaScript/TypeScript: use vitest or jest
4. Run the tests after creating them
5. If tests fail, report which ones failed and why

When done, summarize: how many tests passed, how many failed, and any issues found."""

MAX_TOOL_ROUNDS = 12


@AgentRegistry.register
class TestingAgent(BaseAgent):
    name = "testing"
    description = "Generates and runs test cases"
    capabilities = ["test_generation", "test_execution", "coverage_analysis"]
    model_tier = "light"

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        settings = get_settings()
        llm = create_llm(settings.llm, self.model_tier)

        plan = state.get("plan", [])
        current_step = state.get("current_step", 0)
        task_desc = plan[current_step]["description"] if current_step < len(plan) else "Write and run tests"
        project_path = state.get("project_path", ".")
        artifacts = state.get("artifacts", {})
        files_modified = artifacts.get("files_modified", [])

        # Give the tester context about what was built
        context = f"Project directory: {project_path}\n\nTask: {task_desc}"
        if files_modified:
            context += f"\n\nFiles that were recently created/modified:\n" + "\n".join(f"- {f}" for f in files_modified)

        logger.info("tester_executing", task=task_desc[:80])
        # Step intro already spoken by orchestrator.

        all_tools = FILE_TOOLS + TERMINAL_TOOLS
        all_tool_map = {**FILE_TOOL_MAP, **TERMINAL_TOOL_MAP}

        messages = [
            SystemMessage(content=TESTER_SYSTEM_PROMPT),
            HumanMessage(content=context),
        ]

        test_files_created = []
        test_results = []

        for round_num in range(MAX_TOOL_ROUNDS):
            response = await self.call_llm(llm, messages, all_tools, state=state)

            if not response.tool_calls:
                break

            tool_results = []
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = dict(tool_call["args"])

                # Narrate before each action
                await self.narrate_tool_call(state, tool_name, tool_args)

                if tool_name in FILE_TOOL_MAP:
                    tool_args["project_root"] = project_path
                elif tool_name == "run_command":
                    tool_args["working_dir"] = project_path

                fn = all_tool_map.get(tool_name)
                if fn is None:
                    result = {"error": f"Unknown tool: {tool_name}"}
                else:
                    result = await self.invoke_tool(fn, tool_args)

                if tool_name in ("write_file", "create_file") and "error" not in result:
                    test_files_created.append(result.get("path", ""))
                if tool_name == "run_command":
                    test_results.append({
                        "command": tool_args.get("command", ""),
                        "exit_code": result.get("exit_code", -1),
                        "stdout": result.get("stdout", "")[:500],
                        "stderr": result.get("stderr", "")[:500],
                    })

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

        final_text = self.response_text(response) or "Testing completed."

        artifacts.setdefault("test_files", []).extend(test_files_created)
        artifacts["test_results"] = test_results
        state["artifacts"] = artifacts

        if current_step < len(plan):
            plan[current_step]["status"] = "completed"
            plan[current_step]["result"] = {
                "test_files": test_files_created,
                "test_results": test_results,
                "summary": final_text[:300],
            }
            state["plan"] = plan

        state["final_response"] = final_text
        logger.info("tester_completed", tests_created=len(test_files_created))

        # Friendly summary
        failed = sum(1 for r in test_results if r.get("exit_code") not in (0, None))
        if test_files_created and failed == 0:
            await self.narrate(state, "Tests are passing. Looking good!")
        elif failed:
            await self.narrate(state, f"Tests finished. {failed} of them came back with issues, I'll flag those.")
        else:
            await self.narrate(state, "Test pass is wrapped up.")

        return state

    def get_tools(self) -> list[ToolDefinition]:
        return [
            ToolDefinition(name=t["name"], description=t["description"], parameters=t["parameters"])
            for t in FILE_TOOLS + TERMINAL_TOOLS
        ]
