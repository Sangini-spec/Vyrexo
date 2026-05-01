"""
Agent Orchestrator — Runs the multi-agent LangGraph pipeline.

Flow: PlannerAgent → Router → [CodingAgent|ExecutionAgent|...] → Router → ... → END

The graph is built dynamically from the AgentRegistry, so Phase 2 agents
plug in automatically when registered.
"""

from __future__ import annotations

from typing import Any

import structlog

from vyrexo.agents.registry import AgentRegistry
from vyrexo.agents.state import AgentState
from vyrexo.events.bus import Event, EventBus

logger = structlog.get_logger()


class AgentOrchestrator:
    """
    Orchestrates the multi-agent pipeline.

    For MVP, uses a simple sequential loop rather than full LangGraph
    compilation (which requires specific LangGraph version compatibility).
    The pattern is identical — Planner creates steps, Router picks the next
    agent, each agent executes and updates state.

    Phase 2: Swap to compiled LangGraph StateGraph with checkpointing
    for interrupt/resume support.
    """

    def __init__(self, event_bus: EventBus) -> None:
        self._event_bus = event_bus
        self._is_running = False
        self._interrupted = False

    @property
    def is_running(self) -> bool:
        return self._is_running

    async def run(self, user_message: str, project_path: str, session_id: str = "") -> dict[str, Any]:
        """
        Run the full agent pipeline for a user message.

        1. PlannerAgent creates a plan
        2. Router iterates through plan steps
        3. Each step is executed by the assigned agent
        4. Results accumulate in shared state
        """
        self._is_running = True
        self._interrupted = False

        # Initialize state
        state: dict[str, Any] = {
            "messages": [{"role": "user", "content": user_message}],
            "session_id": session_id,
            "project_path": project_path,
            "plan": [],
            "current_step": 0,
            "artifacts": {},
            "agent_decisions": [],
            "conflicts": [],
            "interrupted": False,
            "mode": "normal",
            "final_response": "",
        }

        try:
            # Step 1: Planning
            await self._publish_step_event("planner", "Creating development plan...", session_id)
            planner = AgentRegistry.create("planner")
            state = await planner.execute(state)

            await self._event_bus.publish(Event(
                type="agent.plan.created",
                payload={"plan": state.get("plan", [])},
                session_id=session_id,
            ))

            # Step 2: Execute each step in the plan
            plan = state.get("plan", [])
            for i, step in enumerate(plan):
                if self._interrupted:
                    logger.info("orchestrator_interrupted", step=i)
                    state["interrupted"] = True
                    break

                state["current_step"] = i
                agent_name = step["agent_name"]

                # Check if agent is registered
                if agent_name not in AgentRegistry.all():
                    logger.warning("agent_not_found", name=agent_name, fallback="coding")
                    agent_name = "coding"

                # Publish step start
                step["status"] = "running"
                await self._event_bus.publish(Event(
                    type="agent.plan.step.started",
                    payload={
                        "step_index": i,
                        "agent": agent_name,
                        "description": step["description"],
                    },
                    session_id=session_id,
                ))

                # Execute the agent
                agent = AgentRegistry.create(agent_name)
                state = await agent.execute(state)

                # Publish step complete
                await self._event_bus.publish(Event(
                    type="agent.plan.step.completed",
                    payload={
                        "step_index": i,
                        "agent": agent_name,
                        "result": step.get("result", {}),
                    },
                    session_id=session_id,
                ))

            # Build final response summary
            if not state.get("final_response"):
                state["final_response"] = self._build_summary(state)

        except Exception as e:
            logger.exception("orchestrator_error")
            state["final_response"] = f"I encountered an error: {str(e)}"
            await self._event_bus.publish(Event(
                type="agent.error",
                payload={"error": str(e)},
                session_id=session_id,
            ))
        finally:
            self._is_running = False

        return state

    async def interrupt(self) -> None:
        """Interrupt the current execution."""
        self._interrupted = True
        logger.info("orchestrator_interrupt")

    async def _publish_step_event(self, agent: str, description: str, session_id: str) -> None:
        await self._event_bus.publish(Event(
            type="agent.plan.step.started",
            payload={"agent": agent, "description": description},
            session_id=session_id,
        ))

    def _build_summary(self, state: dict[str, Any]) -> str:
        """Build a natural language summary of what was done."""
        artifacts = state.get("artifacts", {})
        files = artifacts.get("files_modified", [])
        commands = artifacts.get("commands_run", [])
        plan = state.get("plan", [])
        completed = sum(1 for s in plan if s.get("status") == "completed")

        parts = [f"I completed {completed} out of {len(plan)} steps."]
        if files:
            parts.append(f"Modified {len(files)} files: {', '.join(files[:5])}")
        if commands:
            parts.append(f"Ran {len(commands)} commands.")

        return " ".join(parts)
