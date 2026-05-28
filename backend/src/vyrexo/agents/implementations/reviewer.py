"""
ReviewAgent — Reviews code for security, quality, and bugs.

Analyzes recently written code and provides actionable feedback.
Phase 2: Can populate AgentState.conflicts when disagreeing with CodingAgent.
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
from vyrexo.config import get_settings

logger = structlog.get_logger()

REVIEWER_SYSTEM_PROMPT = """You are Rex, the friendly AI coding assistant in Vyrexo. You're honest but kind — you point out issues constructively and always acknowledge what's done well.

Your job is to review code that was just written and identify issues. Narrate like: "Let me take a careful look at this..." or "Nice work on the structure! I just spotted one thing we should fix."

You have access to:
- read_file: Read the files to review
- list_directory: See project structure

Review checklist:
1. **Security**: SQL injection, XSS, command injection, hardcoded secrets, insecure auth
2. **Bugs**: Null pointer risks, off-by-one errors, race conditions, unhandled exceptions
3. **Code Quality**: Dead code, duplicated logic, unclear naming, missing error handling
4. **Best Practices**: Type hints, input validation, proper logging, separation of concerns
5. **Performance**: N+1 queries, unnecessary loops, missing indexes, memory leaks

For each issue found, report:
- Severity: critical / warning / info
- File and approximate location
- What the issue is
- How to fix it

If no issues found, say so. Be thorough but not nitpicky — focus on real problems.

At the end, give an overall assessment: PASS (ship it), PASS WITH WARNINGS (minor issues), or NEEDS FIXES (blocking issues)."""

MAX_TOOL_ROUNDS = 8


@AgentRegistry.register
class ReviewAgent(BaseAgent):
    name = "review"
    description = "Reviews code for security, quality, and bugs"
    capabilities = ["security_review", "code_quality", "bug_detection"]
    model_tier = "light"

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        settings = get_settings()
        llm = create_llm(settings.llm, self.model_tier)

        plan = state.get("plan", [])
        current_step = state.get("current_step", 0)
        task_desc = plan[current_step]["description"] if current_step < len(plan) else "Review code"
        project_path = state.get("project_path", ".")
        artifacts = state.get("artifacts", {})
        files_modified = artifacts.get("files_modified", [])

        context = f"Project directory: {project_path}\n\nTask: {task_desc}"
        if files_modified:
            context += f"\n\nFiles to review:\n" + "\n".join(f"- {f}" for f in files_modified)

        logger.info("reviewer_executing", task=task_desc[:80], files=len(files_modified))
        # Step intro already spoken by orchestrator.

        messages = [
            SystemMessage(content=REVIEWER_SYSTEM_PROMPT),
            HumanMessage(content=context),
        ]

        issues_found = []

        for round_num in range(MAX_TOOL_ROUNDS):
            response = await llm.ainvoke(messages, tools=FILE_TOOLS)

            if not response.tool_calls:
                break

            tool_results = []
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = dict(tool_call["args"])

                # Live narration before each read
                await self.narrate_tool_call(state, tool_name, tool_args)

                if tool_name in FILE_TOOL_MAP:
                    tool_args["project_root"] = project_path

                fn = FILE_TOOL_MAP.get(tool_name)
                if fn is None:
                    result = {"error": f"Unknown tool: {tool_name}"}
                elif asyncio.iscoroutinefunction(fn):
                    result = await fn(**tool_args)
                else:
                    result = fn(**tool_args)

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

        final_text = response.content if hasattr(response, "content") else "Review completed."

        # Phase 2: Parse issues and populate state.conflicts if critical
        artifacts["review_result"] = final_text[:1000]
        state["artifacts"] = artifacts

        if current_step < len(plan):
            plan[current_step]["status"] = "completed"
            plan[current_step]["result"] = {"summary": final_text[:500]}
            state["plan"] = plan

        state["final_response"] = final_text
        logger.info("reviewer_completed")

        # Brief verbal summary
        lowered = final_text.lower() if final_text else ""
        if "needs fixes" in lowered:
            await self.narrate(state, "Review done. There are a few things we should fix before shipping.")
        elif "warning" in lowered:
            await self.narrate(state, "Review done. Mostly looks good, just a few minor warnings.")
        else:
            await self.narrate(state, "Review done. The code looks clean. Nice work.")

        return state

    def get_tools(self) -> list[ToolDefinition]:
        return [
            ToolDefinition(name=t["name"], description=t["description"], parameters=t["parameters"])
            for t in FILE_TOOLS
        ]
