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
        # When the user interrupts mid-execution we stash the state here so the
        # next user instruction can resume from where we left off instead of
        # starting from scratch.
        self._paused_state: dict[str, Any] | None = None

    @property
    def is_running(self) -> bool:
        return self._is_running

    @property
    def has_paused_state(self) -> bool:
        return self._paused_state is not None

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
            # Injected so agents can call self.narrate(state, "...") for live commentary
            "event_bus": self._event_bus,
        }

        try:
            # Step 1: Planning
            await self._narrate(session_id, "Alright, let me think through this and put together a plan.")
            await self._publish_step_event("planner", "Creating development plan...", session_id)
            planner = AgentRegistry.create("planner")
            state = await planner.execute(state)

            await self._event_bus.publish(Event(
                type="agent.plan.created",
                payload={"plan": state.get("plan", [])},
                session_id=session_id,
            ))

            plan = state.get("plan", [])
            if plan:
                step_count = len(plan)
                await self._narrate(
                    session_id,
                    f"Okay, here's the plan. I'll go through {step_count} step{'s' if step_count != 1 else ''} now. Stay with me!",
                )

            # Step 2: Execute each step in the plan
            for i, step in enumerate(plan):
                if self._interrupted:
                    logger.info("orchestrator_interrupted", step=i)
                    state["interrupted"] = True
                    # Reset the in-flight step so resume() can re-run it with new instructions
                    if i < len(plan) and plan[i].get("status") == "running":
                        plan[i]["status"] = "pending"
                    state["plan"] = plan
                    state["current_step"] = i
                    # Save the paused state so the next instruction can resume cleanly
                    self._paused_state = state
                    await self._narrate(session_id, "Holding on, I heard you. What would you like instead?")
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

                # Narrate the step in a natural way ("Step 2 of 5: writing the auth router")
                friendly_step = self._friendly_step_intro(i, len(plan), agent_name, step["description"])
                await self._narrate(session_id, friendly_step)

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

    async def resume(self, new_instruction: str) -> dict[str, Any] | None:
        """
        Resume execution from a paused state with a new direction from the user.

        Picks up at the step we were interrupted on, re-plans the *remaining* work
        with the new instruction in context (completed steps are kept), and runs
        the updated plan to completion. Returns None if there's no paused state
        so the caller can fall back to a fresh run().
        """
        if self._paused_state is None:
            return None

        state = self._paused_state
        self._paused_state = None
        self._is_running = True
        self._interrupted = False

        session_id = state.get("session_id", "")
        # Re-inject event bus reference (state was preserved across the boundary)
        state["event_bus"] = self._event_bus
        state["interrupted"] = False

        # Add the new instruction to the conversation history
        messages = state.setdefault("messages", [])
        messages.append({"role": "user", "content": f"Change of direction: {new_instruction}"})

        await self._narrate(session_id, "Got it, switching direction. Let me adjust the plan.")

        # Capture what was already done so we don't redo it
        prior_plan = state.get("plan", [])
        done_steps = [s for s in prior_plan if s.get("status") == "completed"]
        if done_steps:
            messages.append({
                "role": "system",
                "content": (
                    "These steps were already completed before the user changed direction: "
                    + "; ".join(s.get("description", "") for s in done_steps)
                    + ". Re-plan only the remaining work given the new direction."
                ),
            })

        try:
            # Re-plan just the remaining work
            planner = AgentRegistry.create("planner")
            state = await planner.execute(state)

            # Merge: keep completed steps from before, append the newly-planned remaining steps
            new_plan = state.get("plan", [])
            merged: list[dict] = []
            for i, s in enumerate(done_steps):
                s_copy = dict(s)
                s_copy["index"] = i
                merged.append(s_copy)
            for s in new_plan:
                if s.get("status") != "completed":
                    s_copy = dict(s)
                    s_copy["index"] = len(merged)
                    s_copy["status"] = "pending"
                    merged.append(s_copy)
            state["plan"] = merged
            state["current_step"] = len(done_steps)

            await self._event_bus.publish(Event(
                type="agent.plan.created",
                payload={"plan": merged, "resumed": True},
                session_id=session_id,
            ))

            # Execute the remaining steps
            for i in range(state["current_step"], len(merged)):
                if self._interrupted:
                    logger.info("orchestrator_interrupted_during_resume", step=i)
                    state["interrupted"] = True
                    if i < len(merged) and merged[i].get("status") == "running":
                        merged[i]["status"] = "pending"
                    state["plan"] = merged
                    state["current_step"] = i
                    self._paused_state = state
                    await self._narrate(session_id, "Pausing again. What's the new direction?")
                    break

                state["current_step"] = i
                step = merged[i]
                agent_name = step["agent_name"]
                if agent_name not in AgentRegistry.all():
                    agent_name = "coding"

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
                await self._narrate(session_id, self._friendly_step_intro(i, len(merged), agent_name, step["description"]))

                agent = AgentRegistry.create(agent_name)
                state = await agent.execute(state)

                await self._event_bus.publish(Event(
                    type="agent.plan.step.completed",
                    payload={
                        "step_index": i,
                        "agent": agent_name,
                        "result": step.get("result", {}),
                    },
                    session_id=session_id,
                ))

            if not state.get("final_response"):
                state["final_response"] = self._build_summary(state)

        except Exception as e:
            logger.exception("orchestrator_resume_error")
            state["final_response"] = f"I hit a snag while resuming: {str(e)}"
            await self._event_bus.publish(Event(
                type="agent.error",
                payload={"error": str(e)},
                session_id=session_id,
            ))
        finally:
            self._is_running = False

        return state

    async def _publish_step_event(self, agent: str, description: str, session_id: str) -> None:
        await self._event_bus.publish(Event(
            type="agent.plan.step.started",
            payload={"agent": agent, "description": description},
            session_id=session_id,
        ))

    async def _narrate(self, session_id: str, text: str) -> None:
        """Orchestrator-level narration (agent-agnostic commentary)."""
        if not text:
            return
        await self._event_bus.publish(Event(
            type="agent.narration",
            payload={"text": text, "agent": "orchestrator"},
            session_id=session_id,
        ))

    def _friendly_step_intro(self, step_index: int, total_steps: int, agent_name: str, description: str) -> str:
        """Build a natural intro line for a plan step that Rex will speak aloud."""
        # Trim the description to something speakable, dropping markdown noise
        short_desc = description.strip().rstrip(".").lower()
        agent_phrase = {
            "planner": "thinking through the next move",
            "coding": "writing the code",
            "executor": "running this on the system",
            "testing": "running the tests",
            "review": "reviewing what we have",
            "documentation": "writing the documentation",
        }.get(agent_name, "working on this")
        ordinal = f"Step {step_index + 1} of {total_steps}"
        return f"{ordinal}: {agent_phrase}. I'm going to {short_desc}."

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
