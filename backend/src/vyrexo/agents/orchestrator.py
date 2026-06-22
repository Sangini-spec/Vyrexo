"""
Agent Orchestrator — Runs the multi-agent LangGraph pipeline.

Flow: PlannerAgent → Router → [CodingAgent|ExecutionAgent|...] → Router → ... → END

The graph is built dynamically from the AgentRegistry, so Phase 2 agents
plug in automatically when registered.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

import structlog

from vyrexo.agents.registry import AgentRegistry
from vyrexo.agents.state import AgentState
from vyrexo.events.bus import Event, EventBus
from vyrexo.utils.errors import friendly_error

logger = structlog.get_logger()

# How many times the verify→fix loop may run before giving up.
MAX_REPAIR_ROUNDS = 3

# ── Friendly companion small-talk ────────────────────────────────────────────
# When a task goes quiet for a while (which happens during slow local-model
# calls), Rex keeps the user company — JARVIS-style. Builds now run in the
# background, so the user can actually reply and Rex hears them. We keep the
# cadence relaxed (a longer silence threshold) and lean toward calm, reassuring
# status lines rather than peppering the user with questions every few seconds.
SILENCE_THRESHOLD = 35.0       # seconds of dead air before a friendly check-in
CHATTER_CHECK_INTERVAL = 7.0   # how often the companion checks for silence

SMALL_TALK = [
    "Still on it — this step takes the local model a little while.",
    "Working through it. I'll let you know the moment it's ready.",
    "Hang tight, making good progress here.",
    "Almost through this part. So, how's your day going?",
    "Still building — feel free to ask me anything while I work.",
    "Bear with me, I'm doing this properly so it actually works.",
    "Crunching through it. Anything you want me to keep in mind for this?",
    "Nearly done with this step.",
]

# Self-contained verifier run inside the project: syntax-compile every .py file,
# then import the entry points (main.py / app.py) so missing modules and broken
# imports surface. Prints VERIFY_OK on success, or VERIFY_FAILED + the errors.
VERIFY_SCRIPT = r'''
import sys, py_compile, importlib, pathlib
root = pathlib.Path('.').resolve()
SKIP = {'venv', '.venv', 'env', 'site-packages', '__pycache__', '.git',
        'node_modules', 'build', 'dist', '.next', '.mypy_cache', '.pytest_cache'}
pyfiles = [p for p in root.rglob('*.py') if not (set(p.parts) & SKIP)]
errors = []
for p in pyfiles:
    try:
        py_compile.compile(str(p), doraise=True)
    except py_compile.PyCompileError as e:
        errors.append('SyntaxError in %s: %s' % (p.relative_to(root), getattr(e, 'msg', str(e))))
if not errors:
    sys.path.insert(0, str(root))
    entries = [p for p in pyfiles if p.name in ('main.py', 'app.py')]
    for p in entries:
        mod = '.'.join(p.relative_to(root).with_suffix('').parts)
        try:
            importlib.import_module(mod)
        except Exception as e:
            errors.append('Importing %s (%s) failed: %s: %s' % (
                mod, p.relative_to(root), type(e).__name__, e))
if errors:
    print('VERIFY_FAILED')
    for e in errors[:10]:
        print('- ' + e)
    sys.exit(1)
print('VERIFY_OK (%d files checked)' % len(pyfiles))
'''

# Repair task handed to the coder when verification fails. The exact error
# report is injected so the coder fixes the real problem (create missing files,
# correct imports, install missing deps via run_command, etc.).
REPAIR_TASK = (
    "The project currently FAILS to build/import. Fix it so it imports cleanly.\n\n"
    "Verification output:\n{report}\n\n"
    "Read the relevant files, then create any missing modules/files, correct the "
    "imports, and fix syntax errors. If a third-party package is missing, install "
    "it with run_command (pip install). Make the actual edits — do not just describe them."
)


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
        self._last_activity = 0.0  # monotonic timestamp of the last narration
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

    async def preview_plan(self, user_message: str, project_path: str, session_id: str = "") -> list[dict[str, Any]]:
        """Run ONLY the planner and return the steps — no code is written.

        Used by the approval gate: the user sees and approves this plan before
        anything executes.
        """
        state: dict[str, Any] = {
            "messages": [{"role": "user", "content": user_message}],
            "session_id": session_id,
            "project_path": project_path,
            "plan": [],
            "current_step": 0,
            "artifacts": {},
            "event_bus": self._event_bus,
        }
        planner = AgentRegistry.create("planner")
        state = await planner.execute(state)
        return state.get("plan", []) or []

    async def run(
        self,
        user_message: str,
        project_path: str,
        session_id: str = "",
        approved_plan: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """
        Run the full agent pipeline for a user message.

        1. PlannerAgent creates a plan (skipped if an approved_plan is supplied)
        2. Router iterates through plan steps
        3. Each step is executed by the assigned agent
        4. Results accumulate in shared state
        """
        self._is_running = True
        self._interrupted = False
        self._last_activity = time.monotonic()

        # Companion small-talk: any narration (from agents or the orchestrator)
        # counts as "activity"; the companion only speaks when there's been a
        # real silent gap, so it fills slow-model dead air without talking over
        # actual progress updates.
        async def _touch_activity(_e: Event) -> None:
            self._last_activity = time.monotonic()

        unsub_activity = self._event_bus.subscribe("agent.narration", _touch_activity)
        companion = asyncio.create_task(self._companion_chatter(session_id))

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
            # Lets agents bail between tool calls the moment the user interrupts,
            # so work halts mid-step (not just at step boundaries).
            "is_interrupted": lambda: self._interrupted,
        }

        try:
            # Step 1: Planning — unless the user already approved a plan, in
            # which case we skip straight to execution.
            if approved_plan:
                state["plan"] = approved_plan
            else:
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
                    f"Got it. {step_count} step{'s' if step_count != 1 else ''}.",
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

            # Verify the build and repair any failures — but only for a real
            # connected project that actually had code written or commands run
            # (skip pure reviews/questions and the no-project case so we never
            # compile the server's own repo).
            agents_used = {s.get("agent_name") for s in plan}
            if (
                not self._interrupted
                and project_path not in ("", ".")
                and (agents_used & {"coding", "executor"})
            ):
                state = await self._verify_and_repair(state, session_id, project_path)

            # Build final response summary
            if not state.get("final_response"):
                state["final_response"] = self._build_summary(state)

        except Exception as e:
            logger.exception("orchestrator_error")
            # Speak a clean message, but keep the raw error in the event payload
            # (the frontend can log it; it's never read aloud).
            state["final_response"] = friendly_error(e)
            await self._event_bus.publish(Event(
                type="agent.error",
                payload={"error": str(e), "message": state["final_response"]},
                session_id=session_id,
            ))
        finally:
            self._is_running = False
            companion.cancel()
            try:
                unsub_activity()
            except Exception:
                pass

        return state

    # ── Build verification & repair ──────────────────────────────────────────

    async def _verify_and_repair(
        self, state: dict[str, Any], session_id: str, project_path: str
    ) -> dict[str, Any]:
        """Run a build/import check; if it fails, feed the error back to the
        coder and loop until the project is green (or we hit the round cap).

        This is what turns "the pipeline finished" into "the project actually
        imports and runs" — it catches missing modules, broken imports, and
        syntax errors that individual agent steps can leave behind.
        """
        for round_num in range(MAX_REPAIR_ROUNDS):
            ok, report = await self._run_verification(project_path)
            if ok:
                msg = (
                    "Verified — the project builds and imports cleanly."
                    if round_num == 0
                    else "Fixed it — the project builds and imports cleanly now."
                )
                await self._narrate(session_id, msg)
                state.setdefault("artifacts", {})["verified"] = True
                return state

            if self._interrupted:
                break

            await self._narrate(
                session_id,
                "The build has an issue — let me read the error and fix it.",
            )
            logger.info("verify_failed_repairing", round=round_num + 1, report=report[:300])

            # Hand the exact failure to the coder as a focused repair task.
            plan = state.get("plan", [])
            repair_step = {
                "index": len(plan),
                "description": REPAIR_TASK.format(report=report),
                "agent_name": "coding",
                "status": "running",
                "result": None,
            }
            plan.append(repair_step)
            state["plan"] = plan
            state["current_step"] = len(plan) - 1

            coder = AgentRegistry.create("coding")
            state = await coder.execute(state)

        # Final check after the repair rounds
        ok, report = await self._run_verification(project_path)
        state.setdefault("artifacts", {})["verified"] = ok
        if ok:
            await self._narrate(session_id, "The project builds and imports cleanly now.")
        else:
            await self._narrate(
                session_id,
                "I couldn't fully get it building after a few tries — there may be "
                "a remaining issue worth a closer look.",
            )
            logger.warning("verify_unresolved", report=report[:300])
        return state

    async def _run_verification(self, project_path: str) -> tuple[bool, str]:
        """Syntax-compile every .py file and import the entry points.

        Returns (ok, report). A project with no Python entry files passes the
        syntax stage and is treated as clean (JS/other builds aren't checked here).
        """
        import base64

        from vyrexo.agents.tools.terminal import run_command

        encoded = base64.b64encode(VERIFY_SCRIPT.encode("utf-8")).decode("ascii")
        command = f'python -c "import base64;exec(base64.b64decode(\'{encoded}\').decode())"'
        try:
            result = await run_command(command=command, working_dir=project_path, timeout=90)
        except Exception as e:
            return False, f"Could not run verification: {e}"

        out = ((result.get("stdout") or "") + "\n" + (result.get("stderr") or "")).strip()
        ok = result.get("success", False) and "VERIFY_OK" in out
        return ok, out[:1500]

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
        state["is_interrupted"] = lambda: self._interrupted
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
        self._last_activity = time.monotonic()
        await self._event_bus.publish(Event(
            type="agent.narration",
            payload={"text": text, "agent": "orchestrator"},
            session_id=session_id,
        ))

    async def _companion_chatter(self, session_id: str) -> None:
        """Keep the user company with warm small-talk during long silent gaps.

        Fires only when there's been ``SILENCE_THRESHOLD`` seconds with no
        narration — i.e. genuine dead air while a slow step runs. On fast
        providers the gaps never get long enough, so it stays quiet.
        """
        idx = 0
        try:
            # Initial grace so we never chatter the instant a task starts.
            await asyncio.sleep(SILENCE_THRESHOLD)
            while self._is_running and not self._interrupted:
                if (time.monotonic() - self._last_activity) >= SILENCE_THRESHOLD:
                    line = SMALL_TALK[idx % len(SMALL_TALK)]
                    idx += 1
                    self._last_activity = time.monotonic()  # space out the chatter
                    await self._event_bus.publish(Event(
                        type="agent.narration",
                        payload={"text": line, "agent": "rex", "kind": "smalltalk"},
                        session_id=session_id,
                    ))
                await asyncio.sleep(CHATTER_CHECK_INTERVAL)
        except asyncio.CancelledError:
            pass
        except Exception:
            logger.debug("companion_chatter_stopped")

    def _friendly_step_intro(self, step_index: int, total_steps: int, agent_name: str, description: str) -> str:
        """Build a SHORT intro line for a plan step. Speed > flavor."""
        agent_verb = {
            "planner": "Planning",
            "coding": "Coding",
            "executor": "Running",
            "testing": "Testing",
            "review": "Reviewing",
            "documentation": "Writing docs for",
        }.get(agent_name, "Working on")
        # Trim the description hard so the spoken line stays under ~2 seconds
        short_desc = description.strip().rstrip(".")
        if len(short_desc) > 70:
            short_desc = short_desc[:70].rsplit(" ", 1)[0] + "..."
        return f"Step {step_index + 1}: {agent_verb} {short_desc}."

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
