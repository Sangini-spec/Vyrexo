"""
PlannerAgent — Breaks high-level instructions into structured task steps.

This agent is always the first node in the LangGraph DAG.
It receives the developer's request and creates an execution plan
that routes to other agents.
"""

from __future__ import annotations

import json
from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from vyrexo.agents.base import BaseAgent, ToolDefinition
from vyrexo.agents.llm_factory import create_llm
from vyrexo.agents.registry import AgentRegistry
from vyrexo.config import get_settings

logger = structlog.get_logger()

PLANNER_SYSTEM_PROMPT = """You are Rex, the friendly AI coding assistant in Vyrexo. You're warm, encouraging, and always happy to help.

Your job is to take a developer's request and break it into a structured execution plan. You speak like a helpful friend — enthusiastic but professional.

Available agents you can assign tasks to:
- "coding": Writes and modifies source code files
- "executor": Runs terminal commands (install packages, run scripts, start servers)
- "testing": Generates and runs test cases
- "review": Reviews code for security, quality, and bugs
- "documentation": Generates README, API docs, comments

Rules:
1. Break the request into 2-7 clear, specific steps
2. Each step must specify which agent handles it
3. Order steps logically (e.g., init project before writing code)
4. Be specific about what each step should accomplish

Respond with a JSON array of steps. Each step has:
- "description": What to do (be specific)
- "agent_name": Which agent handles this step

Example response:
[
  {"description": "Initialize a new FastAPI project with virtual environment", "agent_name": "executor"},
  {"description": "Install fastapi, uvicorn, sqlalchemy, and alembic", "agent_name": "executor"},
  {"description": "Create database models for User with email, password_hash, created_at fields", "agent_name": "coding"},
  {"description": "Create authentication endpoints: POST /register, POST /login, GET /me", "agent_name": "coding"},
  {"description": "Write tests for all authentication endpoints", "agent_name": "testing"},
  {"description": "Review authentication code for security vulnerabilities", "agent_name": "review"}
]

Respond ONLY with the JSON array, no other text."""


@AgentRegistry.register
class PlannerAgent(BaseAgent):
    name = "planner"
    description = "Breaks high-level instructions into structured development tasks"
    capabilities = ["planning", "task_decomposition", "step_ordering"]
    model_tier = "light"  # Uses Gemini Flash (swap to "heavy" when Pro quota is available)

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        settings = get_settings()
        llm = create_llm(settings.llm, self.model_tier)

        # Get the latest user message
        messages = state.get("messages", [])
        user_request = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_request = msg.get("content", "")
                break

        if not user_request:
            state["plan"] = []
            state["final_response"] = "I didn't catch that. Could you repeat your request?"
            return state

        logger.info("planner_executing", request=user_request[:80])
        await self.narrate(state, "Let me figure out the best way to approach this.")

        # Call Gemini to create the plan
        response = await llm.ainvoke([
            SystemMessage(content=PLANNER_SYSTEM_PROMPT),
            HumanMessage(content=f"Developer request: {user_request}"),
        ])

        # Parse the plan from JSON response
        try:
            plan_text = response.content.strip()
            # Handle markdown code blocks
            if plan_text.startswith("```"):
                plan_text = plan_text.split("```")[1]
                if plan_text.startswith("json"):
                    plan_text = plan_text[4:]

            steps_raw = json.loads(plan_text)
            plan = []
            for i, step in enumerate(steps_raw):
                plan.append({
                    "index": i,
                    "description": step["description"],
                    "agent_name": step["agent_name"],
                    "status": "pending",
                    "result": None,
                })

            state["plan"] = plan
            state["current_step"] = 0
            logger.info("planner_created_plan", steps=len(plan))

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.error("planner_parse_error", error=str(e), response=response.content[:200])
            # Fallback: create a single coding step
            state["plan"] = [{
                "index": 0,
                "description": user_request,
                "agent_name": "coding",
                "status": "pending",
                "result": None,
            }]
            state["current_step"] = 0

        return state

    def get_tools(self) -> list[ToolDefinition]:
        return []  # Planner doesn't use tools, just LLM reasoning
