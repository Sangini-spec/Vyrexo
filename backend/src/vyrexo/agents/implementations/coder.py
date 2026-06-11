"""
CodingAgent — Writes and modifies source code using Gemini + file tools.

This is the core agent that actually generates code. It calls Gemini
with file operation tools, and Gemini decides which files to read,
create, and write.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from vyrexo.agents.base import BaseAgent, ToolDefinition
from vyrexo.agents.llm_factory import create_llm
from vyrexo.agents.registry import AgentRegistry
from vyrexo.agents.tools.file_ops import FILE_TOOL_MAP, FILE_TOOLS
from vyrexo.agents.tools.terminal import TERMINAL_TOOL_MAP, TERMINAL_TOOLS
from vyrexo.config import get_settings

logger = structlog.get_logger()

CODER_SYSTEM_PROMPT = """You are Rex, the friendly AI coding assistant in Vyrexo. You're warm, encouraging, and genuinely excited about building things.

Your job is to write high-quality, production-ready code based on the task description. When you narrate what you're doing, be conversational — like a helpful friend pair-programming with the developer. Say things like "Alright, let me set that up for you!" or "Great choice, this is going to work nicely."

You have access to these tools:
- read_file: Read existing file contents
- write_file: Write/overwrite a file with new content
- create_file: Create a new file (fails if exists)
- list_directory: List files in a directory
- delete_file: Delete a file
- run_command: Execute shell commands (for checking existing code, running linters, etc.)

Rules:
1. Always read existing files before modifying them to understand the current state
2. Write complete, working code — not pseudocode or placeholders
3. Follow the project's existing code style and conventions
4. Include proper imports at the top of every file
5. Use type hints in Python code
6. Handle errors appropriately
7. Create parent directories if needed (write_file does this automatically)

CRITICAL — you must ACTUALLY APPLY changes, not just describe them:
- The task is only complete once you have called write_file (or create_file for
  new files) to save the changed code to disk. Reading or explaining is NOT enough.
- If you are not sure which file holds the code, call list_directory first to see
  the real files, then read the correct one — do not guess filenames.
- Workflow: list_directory / read_file (the real file) -> make the edit ->
  write_file with the FULL updated file contents. Do not stop after only reading.

When you're done, respond with a short summary of the files you actually wrote."""

MAX_TOOL_ROUNDS = 15  # Max Gemini -> tool -> Gemini cycles


@AgentRegistry.register
class CodingAgent(BaseAgent):
    name = "coding"
    description = "Writes and modifies source code files"
    capabilities = ["code_generation", "file_operations", "refactoring"]
    model_tier = "light"  # Uses Gemini Flash (swap to "heavy" when Pro quota is available)

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        settings = get_settings()
        llm = create_llm(settings.llm, self.model_tier)

        # Get current task from plan
        plan = state.get("plan", [])
        current_step = state.get("current_step", 0)
        task_desc = plan[current_step]["description"] if current_step < len(plan) else "Write code"
        project_path = state.get("project_path", ".")

        logger.info("coder_executing", task=task_desc[:80])
        # Intentionally no intro line here — the orchestrator already announced
        # "Step N: Coding ..." so a second "let me start writing" would be redundant.

        # Build tool definitions for Gemini
        tools_for_llm = self._build_tool_defs()

        # Conversation with Gemini (tool-use loop)
        messages = [
            SystemMessage(content=CODER_SYSTEM_PROMPT),
            HumanMessage(content=f"Project directory: {project_path}\n\nTask: {task_desc}"),
        ]

        files_modified = []
        commands_run = []

        for round_num in range(MAX_TOOL_ROUNDS):
            response = await llm.bind_tools(tools_for_llm).ainvoke(messages)

            # Check if Gemini wants to use tools
            if not response.tool_calls:
                # No more tool calls — Gemini is done
                break

            # Execute each tool call
            tool_results = []
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]

                logger.info("coder_tool_call", tool=tool_name, args_keys=list(tool_args.keys()))

                # Narrate what's about to happen so the user hears live commentary
                await self.narrate_tool_call(state, tool_name, tool_args)

                result = await self._execute_tool(tool_name, tool_args, project_path)

                # Track artifacts
                if tool_name in ("write_file", "create_file") and "error" not in result:
                    files_modified.append(result.get("path", tool_args.get("path", "")))
                elif tool_name == "run_command":
                    commands_run.append(tool_args.get("command", ""))

                tool_results.append({
                    "tool_call_id": tool_call.get("id", ""),
                    "name": tool_name,
                    "content": json.dumps(result),
                })

            # Add Gemini's response and tool results to conversation
            messages.append(response)
            for tr in tool_results:
                from langchain_core.messages import ToolMessage
                messages.append(ToolMessage(
                    content=tr["content"],
                    tool_call_id=tr["tool_call_id"],
                    name=tr["name"],
                ))

        # Update state with results
        final_text = self.response_text(response) or "Code changes completed."

        artifacts = state.get("artifacts", {})
        artifacts.setdefault("files_modified", []).extend(files_modified)
        artifacts.setdefault("commands_run", []).extend(commands_run)
        state["artifacts"] = artifacts

        # Update plan step
        if current_step < len(plan):
            plan[current_step]["status"] = "completed"
            plan[current_step]["result"] = {
                "files_modified": files_modified,
                "summary": final_text[:300],
            }
            state["plan"] = plan

        state["final_response"] = final_text
        logger.info("coder_completed", files=len(files_modified), rounds=round_num + 1)

        if files_modified:
            count = len(files_modified)
            await self.narrate(
                state,
                f"Done with the code part. I touched {count} file{'s' if count != 1 else ''}.",
            )
        else:
            await self.narrate(state, "All set on the coding side.")

        return state

    async def _execute_tool(self, name: str, args: dict, project_root: str) -> dict:
        """Execute a tool by name with the given arguments."""
        all_tools = {**FILE_TOOL_MAP, **TERMINAL_TOOL_MAP}

        fn = all_tools.get(name)
        if fn is None:
            return {"error": f"Unknown tool: {name}"}

        # Inject project_root / working_dir into args
        if name in FILE_TOOL_MAP:
            args["project_root"] = project_root
        elif name == "run_command":
            args["working_dir"] = project_root

        # Some tools are async, some are sync
        if asyncio.iscoroutinefunction(fn):
            return await fn(**args)
        else:
            return fn(**args)

    def _build_tool_defs(self) -> list[dict]:
        """Build tool definitions in the format LangChain expects."""
        return FILE_TOOLS + TERMINAL_TOOLS

    def get_tools(self) -> list[ToolDefinition]:
        return [
            ToolDefinition(name=t["name"], description=t["description"], parameters=t["parameters"])
            for t in FILE_TOOLS + TERMINAL_TOOLS
        ]
