"""
DocumentationAgent — Generates README, API docs, and code comments.

Reads the project structure and source code, then generates appropriate
documentation files.
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

DOCUMENTER_SYSTEM_PROMPT = """You are Rex, the friendly AI coding assistant in Vyrexo. You're clear, helpful, and make documentation feel approachable.

Your job is to generate clear, useful documentation for the project. Narrate like: "Let me document everything so it's easy to understand!" or "Writing up a nice README for you."

You have access to:
- read_file: Read source code to understand what it does
- write_file / create_file: Create documentation files
- list_directory: See project structure

Types of documentation you generate:
1. **README.md**: Project overview, setup instructions, usage, API endpoints
2. **API docs**: Endpoint descriptions, request/response examples
3. **Architecture docs**: How the system is structured and why
4. **Inline comments**: Only where logic is complex or non-obvious

Rules:
1. Read the actual code before writing docs — never guess
2. Keep docs concise and practical — no fluff
3. Include real code examples where helpful
4. Document setup steps that a new developer would need
5. If a README already exists, update it rather than overwrite

When done, list what documentation files you created or updated."""

MAX_TOOL_ROUNDS = 10


@AgentRegistry.register
class DocumentationAgent(BaseAgent):
    name = "documentation"
    description = "Generates README, API docs, and architecture summaries"
    capabilities = ["readme_generation", "api_docs", "architecture_docs"]
    model_tier = "light"

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        settings = get_settings()
        llm = create_llm(settings.llm, self.model_tier)

        plan = state.get("plan", [])
        current_step = state.get("current_step", 0)
        task_desc = plan[current_step]["description"] if current_step < len(plan) else "Generate documentation"
        project_path = state.get("project_path", ".")
        artifacts = state.get("artifacts", {})
        files_modified = artifacts.get("files_modified", [])

        context = f"Project directory: {project_path}\n\nTask: {task_desc}"
        if files_modified:
            context += f"\n\nProject files that were created/modified:\n" + "\n".join(f"- {f}" for f in files_modified)

        logger.info("documenter_executing", task=task_desc[:80])
        # Step intro already spoken by orchestrator.

        messages = [
            SystemMessage(content=DOCUMENTER_SYSTEM_PROMPT),
            HumanMessage(content=context),
        ]

        docs_created = []

        for round_num in range(MAX_TOOL_ROUNDS):
            response = await self.call_llm(llm, messages, FILE_TOOLS, state=state)

            if not response.tool_calls:
                break

            tool_results = []
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = dict(tool_call["args"])

                # Live narration
                await self.narrate_tool_call(state, tool_name, tool_args)

                if tool_name in FILE_TOOL_MAP:
                    tool_args["project_root"] = project_path

                fn = FILE_TOOL_MAP.get(tool_name)
                if fn is None:
                    result = {"error": f"Unknown tool: {tool_name}"}
                else:
                    result = await self.invoke_tool(fn, tool_args)

                if tool_name in ("write_file", "create_file") and "error" not in result:
                    docs_created.append(result.get("path", ""))

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

        final_text = self.response_text(response) or "Documentation generated."

        artifacts.setdefault("docs_created", []).extend(docs_created)
        state["artifacts"] = artifacts

        if current_step < len(plan):
            plan[current_step]["status"] = "completed"
            plan[current_step]["result"] = {
                "docs_created": docs_created,
                "summary": final_text[:300],
            }
            state["plan"] = plan

        state["final_response"] = final_text
        logger.info("documenter_completed", docs=len(docs_created))

        if docs_created:
            count = len(docs_created)
            await self.narrate(state, f"Documentation is ready. I put together {count} doc file{'s' if count != 1 else ''}.")
        else:
            await self.narrate(state, "Documentation pass is done.")

        return state

    def get_tools(self) -> list[ToolDefinition]:
        return [
            ToolDefinition(name=t["name"], description=t["description"], parameters=t["parameters"])
            for t in FILE_TOOLS
        ]
