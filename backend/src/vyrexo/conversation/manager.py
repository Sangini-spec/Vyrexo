"""
ConversationManager — Processes user turns and routes to appropriate handlers.

This is the central coordinator between voice input and the agent system.
It classifies intent, enriches context, manages memory, and routes requests.
"""

from __future__ import annotations

import asyncio
import os
import re
from typing import Any, Awaitable, Callable

import structlog
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from vyrexo.agents.llm_factory import create_chat_llm, create_vision_llm
from vyrexo.agents.orchestrator import AgentOrchestrator
from vyrexo.config import get_settings
from vyrexo.context.engine import ContextEngine
from vyrexo.conversation.intent import EXPLAIN_PHRASES, Intent, IntentClassifier
from vyrexo.conversation.memory.base import MemoryEntry, MemoryStore
from vyrexo.events.bus import Event, EventBus
from vyrexo.modes.machine import InteractionStateMachine, ModeState
from vyrexo.preview import is_running as preview_running, start_preview, stop_preview
from vyrexo.utils.documents import extract_documents
from vyrexo.utils.errors import friendly_error
from vyrexo.utils.llm import response_text
from vyrexo.utils.web_search import source_name, web_search
from vyrexo.voice.stt.base import TranscriptionResult


EXPLAIN_SYSTEM_PROMPT = """You are Rex, a friendly senior developer pair-programming with the user over voice. Your job right now is to explain code clearly, the way Claude Code does.

When you explain:
- Talk like you're sitting next to them. Conversational, not formal.
- Identify what file or function you're looking at.
- Walk through what it does in plain English first, then the interesting details.
- Point out anything noteworthy: clever patterns, potential bugs, security concerns, performance issues.
- Keep it concise enough to listen to (you will be spoken aloud). Aim for 4 to 8 sentences unless the code is genuinely complex.
- Do NOT include code blocks or markdown formatting. This is going to be read out by a voice synthesizer.
- End with something inviting like "want me to dig into any part of this?" if there's more to say.

If the context provided doesn't actually answer the user's question, say so honestly and ask which file or function they mean."""

CHAT_SYSTEM_PROMPT = """You are Rex — a witty, warm, genuinely knowledgeable AI assistant talking with a developer over voice. Think JARVIS from Iron Man: personable and a little playful, but sharp and well-informed about the world.

You're great at two things right now:
1. Real conversation — banter, reactions, small talk. Warm and human, never robotic or scripted. Actually respond to what they just said before moving on.
2. Answering general questions about ANYTHING — technology, science, companies, history, the industry, programming concepts, ideas. Give a real, substantive answer from what you actually know. Do NOT deflect with "I can only help with your code" — that's not who you are. If you truly don't know something, say so briefly and honestly.

Voice rules: keep it to 1-4 sentences, conversational, spoken aloud — so no markdown, no code blocks, no bullet lists.

Two honesty rules:
- For fast-moving CURRENT events (this week's headlines, a company's unannounced plans), your knowledge may be a little dated. Still give the best informed answer you can, and briefly note it's "as far as I know" rather than pretending to have live updates. Give a real answer, never a dodge.
- You can NOT see their specific files or code from this chat. If they ask about THEIR OWN project, files, or code, don't guess — say you'll take a look (the system reads the real files for you) and stop there. Never claim work you didn't do.

If they clearly want to build, fix, or change code, gently offer to jump on it."""

# Strict, grounded prompt for answering questions ABOUT the user's codebase. The
# answer must come only from the retrieved code — no invention.
GROUNDED_QA_PROMPT = """You are Rex, a friendly senior developer answering a question about the developer's OWN codebase, out loud over voice.

You are given real excerpts retrieved from their project. Answer the question using ONLY those excerpts:
- Be concise and conversational (spoken aloud — no markdown, code blocks, or lists).
- Cite the file/function you're drawing from in plain words ("in auth.py, the login function...").
- If the excerpts don't actually contain the answer, say so honestly and ask which file or area to look at. Do NOT make anything up or rely on outside assumptions about their code."""

# Answering a general/world question grounded in LIVE web search results — so
# Rex looks things up instead of reciting stale training data.
WEB_QA_PROMPT = """You are Rex, a sharp, JARVIS-like assistant answering a question for a developer, out loud over voice. You just ran a LIVE web search — use the results below to answer.

- Lead with the actual answer. Be conversational and concise (spoken aloud — so no markdown, code blocks, or lists).
- Ground it in the search results. Use the specifics and dates they contain.
- Briefly say where it's from in plain words ("according to Google's blog…", "TechCrunch reported…") — source names, not URLs.
- If the results don't actually answer it, say what you DID find and that you couldn't confirm the rest. Never invent.
- Keep it to a few sentences unless they clearly want more depth."""

# Fast intent router. The old rule-based classifier defaulted unknown input to
# "command" → which kicked off the whole build pipeline for simple questions.
# This LLM router decides, in ONE word, how to handle a turn so read-only
# questions are answered by *looking*, never by building. (Claude-Code style.)
ROUTER_PROMPT = """You decide how Rex — a smart, JARVIS-like voice assistant for developers — should handle a message. Output EXACTLY one word and nothing else.

Categories:
- chitchat: greetings, small talk, reactions, thanks, social banter ("how are you", "it's going great", "I'm back").
- general: a question about the WORLD or general knowledge — technology, science, companies, history, the industry, programming concepts, opinions, advice — anything NOT about the user's own specific project/files. Rex answers these from what it knows.
- codebase: a question about the USER'S OWN project — their files, their code, their functions, what THEIR code does, how many files THEY have, where something is in their project.
- explain: walk through or explain a specific piece of the user's own code.
- runapp: the user wants to RUN / START / SERVE / LAUNCH the project so they can SEE it — i.e. start the dev server and show a live preview. NOT writing code, just running the existing app.
- command: DO something that creates, writes, edits, fixes, refactors, deletes, or tests code — i.e. actually CHANGES the project.

Rules:
- A question that is NOT specifically about the user's own code/files/project → general.
- Only pick codebase when they're clearly asking about THEIR project's contents.
- "run/start/serve/launch/preview the app/server/project locally" → runapp (start it so they can view it), NOT command.
- Pick command ONLY when real work or a CHANGE is clearly requested. When unsure between a question and a command, pick the question type.

Examples:
"hey rex how's it going" -> chitchat
"it's going great don't worry about me" -> chitchat
"thanks that's perfect" -> chitchat
"what's happening at Google these days" -> general
"what are the big AI companies working on next" -> general
"explain how transformers work" -> general
"what's the best database for a chat app" -> general
"who won the last world cup" -> general
"what files are in the folder" -> codebase
"how many files are there" -> codebase
"tell me what files are present in the project" -> codebase
"what does this project do" -> codebase
"where is the login handled in my code" -> codebase
"explain the main function in app.py" -> explain
"walk me through app.py" -> explain
"run the app" -> runapp
"start the server so I can see it" -> runapp
"run it locally and let me preview it" -> runapp
"spin up the dev server" -> runapp
"launch the project" -> runapp
"create a REST API with auth" -> command
"add a /health endpoint to main.py" -> command
"fix the bug in calc.py" -> command
"build me a todo app" -> command

Output only one word: chitchat, general, codebase, explain, runapp, or command."""

DOC_QA_PROMPT = """You are Rex, a friendly senior developer. The user attached a document; answer their request about it using ONLY its contents below. Spoken aloud — be conversational and concise, no markdown/code blocks/lists. If they didn't ask anything specific, give a short, useful summary. If the document doesn't contain the answer, say so honestly."""

VISION_PROMPT = """You are Rex, a friendly AI coding assistant, looking at image(s) the developer just shared. You'll be heard over voice, so reply naturally and concisely (2-5 sentences, no markdown, code blocks, or lists).

Read the image and respond usefully based on what it is:
- A UI design, mockup, or app screenshot → describe the layout briefly and offer to build it ("want me to build this?").
- An error, stack trace, or terminal screenshot → call out the key error and offer to fix it.
- A diagram or architecture → explain what it shows.
- Code → summarize what it does.
- Anything else → describe it and ask how they'd like to use it.

If they also typed a question, answer that about the image. Don't make things up — only describe what you can actually see."""

# When the user wants the image BUILT, we ask the vision model for a precise,
# implementation-ready spec (this becomes the brief the coder builds from, since
# the coding model itself is text-only — this spec is the bridge image→code).
VISION_BUILD_SPEC_PROMPT = """You are a senior engineer turning a screenshot/design into a PRECISE build spec another developer will implement EXACTLY. Study the image and write a thorough, concrete spec so it can be reproduced faithfully:

- Overall: what kind of screen/app it is and the layout structure (header, sidebar, grid, columns, sections, positioning).
- Every visible element, in order: components, their exact visible text/labels, and how they're arranged.
- Styling: colors (give hex estimates), typography (sizes/weights), spacing, borders, radius, shadows, backgrounds.
- Implied states/interactions: buttons, inputs, hovers, active states, what seems clickable.
- A suggested implementation structure (e.g., the HTML/CSS or component tree) if it's clear.

Be exhaustive and specific — measurements and colors matter. Only describe what is actually visible; if something is ambiguous, note your best guess. Output the spec only."""

logger = structlog.get_logger()

# Directories we never list/count as part of "what files are here".
_SCAN_SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env", ".next",
    "dist", "build", ".mypy_cache", ".pytest_cache", ".idea", ".vscode", ".ruff_cache",
}


class ConversationManager:
    """
    Manages the full conversation lifecycle:

    1. Receives transcribed voice input
    2. Classifies intent
    3. Retrieves relevant codebase context
    4. Routes to agents or handles directly
    5. Stores conversation in memory
    6. Returns response for TTS narration
    """

    def __init__(
        self,
        event_bus: EventBus,
        orchestrator: AgentOrchestrator,
        context_engine: ContextEngine,
        memory_store: MemoryStore,
        mode_machine: InteractionStateMachine,
    ) -> None:
        self._event_bus = event_bus
        self._orchestrator = orchestrator
        self._context = context_engine
        self._memory = memory_store
        self._modes = mode_machine
        self._intent_classifier = IntentClassifier()
        # Per-session pending implementation proposal. After a read-only task
        # (e.g. a review) we offer to implement the fixes; if the user agrees on
        # their next turn, we run the full coder/executor/tester pipeline using
        # the stashed context here. Maps session_id -> the analysis text to act on.
        self._pending_impl: dict[str, str] = {}
        # Per-session pending PLAN awaiting approval. Coding tasks never execute
        # until the user says yes — Rex shows the plan and waits (Claude-Code
        # style). Maps session_id -> {instruction, plan, project_path}.
        self._pending_plan: dict[str, dict] = {}
        # Per-session background build task. The slow agent pipeline runs here so
        # the conversation loop stays live — the user can chat, ask questions, or
        # interrupt WHILE a build runs instead of being blocked behind it.
        self._build_tasks: dict[str, asyncio.Task] = {}
        # Per-session stashed image build spec. After Rex describes a shared image
        # and offers to build it, a follow-up "yes, build it" uses this (the
        # image itself isn't re-sent on the next turn).
        self._pending_vision: dict[str, str] = {}

    async def process_turn(
        self,
        transcript: TranscriptionResult,
        session_id: str,
        project_path: str,
        images: list[str] | None = None,
        documents: list[dict] | None = None,
    ) -> str:
        """
        Process a user conversation turn. Returns the response text for TTS.
        """
        text = transcript.text.strip()
        if not text and not images and not documents:
            return ""

        logger.info("conversation_turn", text=text[:80], session_id=session_id,
                    images=len(images or []), docs=len(documents or []))

        # Store user message in memory (note attachments in the history).
        stored = text or ("[shared an image]" if images else "[shared a document]")
        await self._memory.store(session_id, MemoryEntry(role="user", content=stored))

        # If the user attached image(s), understand them first — that's the whole
        # point of the attachment. Bypasses text intent routing.
        if images:
            response = await self._handle_vision(text, images, session_id, project_path)
            if response:
                await self._memory.store(session_id, MemoryEntry(role="assistant", content=response))
            return response

        # A document attachment: read it and use it as context (summarize/answer,
        # or build from it if they asked).
        if documents:
            doc_context = extract_documents(documents)
            response = await self._handle_document(text, doc_context, session_id, project_path)
            if response:
                await self._memory.store(session_id, MemoryEntry(role="assistant", content=response))
            return response

        # Classify intent (rule-based) — only the unambiguous signals (interrupt,
        # mode switch, git) are taken from this. The command-vs-question-vs-chat
        # decision is made by the LLM router inside _route_intent.
        intent, meta = self._intent_classifier.classify(text)

        await self._event_bus.publish(Event(
            type="conversation.intent.classified",
            payload={"intent": intent.value, "text": text[:60], "meta": meta},
            session_id=session_id,
        ))

        logger.info("intent_classified", intent=intent.value, text=text[:50])

        # Route based on intent
        response = await self._route_intent(intent, meta, transcript, session_id, project_path)

        # Store assistant response in memory
        if response:
            await self._memory.store(session_id, MemoryEntry(role="assistant", content=response))

        return response

    async def _route_intent(
        self,
        intent: Intent,
        meta: dict,
        transcript: TranscriptionResult,
        session_id: str,
        project_path: str,
    ) -> str:
        """Route to the appropriate handler based on intent."""
        text = transcript.text.strip()

        # ── "stop the server/preview" → stop the live preview, not the pipeline
        # (only when one is actually running, so bare "stop" still interrupts). ──
        if preview_running(session_id) and _wants_stop_preview(text):
            await stop_preview(session_id)
            await self._event_bus.publish(Event(
                type="preview.stopped", payload={}, session_id=session_id,
            ))
            return "Done — I stopped the preview server."

        # ── Interrupt always wins, even mid-build ────────────────────────────
        if intent == Intent.INTERRUPT or _is_stop(text):
            await self._cancel_build(session_id)
            await self._orchestrator.interrupt()
            return "Got it, I've stopped. What would you like instead?"

        # ── Pending "implement these fixes?" offer ───────────────────────────
        pending = self._pending_impl.get(session_id)
        if pending is not None:
            # A short, clean "yes" implements; a clear "no" declines; anything
            # longer is a fresh instruction (we drop the offer and route it).
            if _is_affirmative(text) and _is_clean_confirmation(text):
                self._pending_impl.pop(session_id, None)
                return await self._run_implementation(pending, session_id, project_path)
            if _is_negative(text):
                self._pending_impl.pop(session_id, None)
                return "No problem — I'll leave the code as it is. What would you like to do next?"
            self._pending_impl.pop(session_id, None)

        # ── Pending IMAGE build (Rex described a shared image, user says build) ──
        pending_vis = self._pending_vision.get(session_id)
        if pending_vis is not None:
            if (_is_affirmative(text) and _is_clean_confirmation(text)) or _wants_build(text):
                self._pending_vision.pop(session_id, None)
                if project_path in ("", ".", None):
                    self._pending_vision[session_id] = pending_vis  # keep it for after they connect
                    return "Connect a project folder first, then say \"build it\" and I'll reproduce the design there."
                instruction = self._image_build_instruction(pending_vis, text)
                return await self._plan_and_gate(instruction, session_id, project_path, "Great — let me plan out building this. ")
            if _is_negative(text):
                self._pending_vision.pop(session_id, None)
            else:
                self._pending_vision.pop(session_id, None)

        # ── Pending PLAN awaiting approval ───────────────────────────────────
        # Nothing has been written yet. A clean "yes" runs it; a "no" cancels;
        # a verbose "yes, but actually I just wanted X" is re-understood as a
        # fresh request (so a clarification can't get steamrolled into a build).
        plan_pending = self._pending_plan.get(session_id)
        if plan_pending is not None:
            if _is_negative(text):
                self._pending_plan.pop(session_id, None)
                return "Okay, I won't make any changes. Tell me what you'd like to adjust, or what else I can do."
            if _is_affirmative(text) and _is_clean_confirmation(text):
                self._pending_plan.pop(session_id, None)
                return self._launch(
                    session_id,
                    lambda: self._orchestrator.run(
                        user_message=plan_pending["instruction"],
                        project_path=plan_pending["project_path"],
                        session_id=session_id,
                        approved_plan=plan_pending["plan"],
                    ),
                    "Great — starting now. I'll keep you posted as I go, and you can talk to me anytime.",
                )
            # Not a clean yes/no → drop the pending plan and route this turn fresh.
            self._pending_plan.pop(session_id, None)

        # ── "continue / keep going" → resume the paused task ─────────────────
        # (Never let this fall through to web search — that's the bug we hit.)
        if _wants_continue(text):
            if self._orchestrator.has_paused_state:
                return self._launch(
                    session_id,
                    lambda: self._orchestrator.resume(text),
                    "Picking up right where we left off.",
                    offer_impl=False,
                )
            if self._is_busy(session_id):
                return "I'm still on it — I'll keep going and let you know when it's done."
            return ("We're not in the middle of anything right now. What would you like me to work on?")

        # ── Instant, no-LLM answers (status, capabilities, file listing) ─────
        quick = self._quick_answer(text, project_path)
        if quick is not None:
            return quick

        # ── Mode switches ────────────────────────────────────────────────────
        if intent == Intent.MODE_SWITCH:
            target = meta.get("target_mode", "normal")
            try:
                target_mode = ModeState(target)
                success = await self._modes.transition(target_mode)
                return (
                    f"Switched to {target} mode." if success
                    else f"Can't switch to {target} mode from {self._modes.state.value} mode."
                )
            except ValueError:
                return f"Unknown mode: {target}"

        # ── If a build is already running, stay conversational ───────────────
        # The slow pipeline runs in the background; this turn must NOT block on
        # it. Chit-chat and questions are answered live; a new build request is
        # politely deferred so we never run two pipelines at once.
        if self._is_busy(session_id):
            return await self._handle_while_busy(text, session_id, project_path)

        # ── Decide how to handle this turn (LLM router) ──────────────────────
        kind = await self._route_kind(text, intent)

        # Pure social banter → conversational brain. General/world questions →
        # LIVE web search (the JARVIS path: look it up, don't recite from memory).
        if kind == "chitchat":
            return await self._chat_reply(text, session_id, project_path)
        if kind == "general":
            return await self._handle_web_question(text, session_id, project_path)
        if kind == "explain":
            return await self._handle_explain(text, session_id, project_path)
        if kind == "codebase":
            return await self._handle_question(text, session_id, project_path)
        if kind == "runapp":
            return await self._handle_run_preview(session_id, project_path)

        # kind == "command" or git → real work through the agent pipeline.
        if not self._modes.current.should_process_input(transcript):
            return ""

        # If we have a paused state from a recent interrupt, resume (in the
        # background) instead of starting over.
        if self._orchestrator.has_paused_state:
            logger.info("conversation_resume", text=text[:60])
            return self._launch(
                session_id,
                lambda: self._orchestrator.resume(text),
                "Got it — adjusting course and picking back up.",
                offer_impl=False,
            )

        return await self._handle_command(text, transcript, session_id, project_path)

    async def _handle_command(
        self,
        text: str,
        transcript: TranscriptionResult,
        session_id: str,
        project_path: str,
    ) -> str:
        """A genuine build/change request: plan first, then gate on approval."""
        # Detect emotion and adapt the opener
        emotion = transcript.metadata.get("emotion", "neutral")
        emotion_prefix = {
            "frustrated": "I hear you, this is annoying. Let me sort it out. ",
            "confused": "Totally fair, let me break this down clearly. ",
            "urgent": "On it right now. ",
            "tired": "Got it. I'll keep this short and just get it done. ",
            "excited": "Love the energy. Let's go. ",
            "satisfied": "Glad to hear that. ",
        }.get(emotion, "")

        # Enrich with codebase context
        context_str = await self._context.get_context_for_agent(text)
        enriched_message = f"{text}\n\n{context_str}" if context_str else text
        return await self._plan_and_gate(enriched_message, session_id, project_path, emotion_prefix)

    async def _plan_and_gate(self, instruction: str, session_id: str, project_path: str, opener: str = "") -> str:
        """Plan an instruction first; if it would change files, show the plan and
        WAIT for approval. Read-only plans run in the background. Shared by typed
        commands and image-driven builds."""
        plan = await self._orchestrator.preview_plan(instruction, project_path, session_id)
        if not plan:
            return f"{opener}I couldn't put a plan together for that — could you rephrase what you'd like me to do?"

        agents_in_plan = {s.get("agent_name") for s in plan}
        mutating = bool(agents_in_plan & {"coding", "executor", "testing"})

        if mutating:
            # This plan would change files / run commands — show it and WAIT.
            self._pending_plan[session_id] = {
                "instruction": instruction,
                "plan": plan,
                "project_path": project_path,
            }
            summary = self._format_plan(plan)
            return (
                f"{opener}Here's my plan:\n\n{summary}\n\n"
                "Should I go ahead and build this? Say **yes** to start, or tell me what to change."
            )

        # Read-only plan (e.g. a review) — safe to run in the background.
        return self._launch(
            session_id,
            lambda: self._orchestrator.run(
                user_message=instruction,
                project_path=project_path,
                session_id=session_id,
                approved_plan=plan,
            ),
            f"{opener}On it — I'll take a look and report back in a moment.",
        )

    async def _handle_while_busy(self, text: str, session_id: str, project_path: str) -> str:
        """Handle a turn that arrives WHILE a background build is running.

        Keeps the conversation two-way: questions and chit-chat are answered
        immediately (they don't touch the running pipeline); a new build request
        is deferred so we never launch a second pipeline on top of the first.
        """
        kind = await self._route_kind(text, Intent.CONVERSATION)
        if kind == "general":
            return await self._handle_web_question(text, session_id, project_path)
        if kind == "codebase":
            return await self._handle_question(text, session_id, project_path)
        if kind == "explain":
            return await self._handle_explain(text, session_id, project_path)
        if kind == "runapp":
            # Starting a preview is independent of a running build — fine to do now.
            return await self._handle_run_preview(session_id, project_path)
        if kind == "command":
            return (
                "I'm still working on the previous task. Say 'stop' if you'd like me to cancel it — "
                "otherwise I'll finish this first and then jump straight on that."
            )
        return await self._chat_reply(text, session_id, project_path)

    # ── Background execution ─────────────────────────────────────────────────

    def _is_busy(self, session_id: str) -> bool:
        task = self._build_tasks.get(session_id)
        return task is not None and not task.done()

    async def _cancel_build(self, session_id: str) -> None:
        # COOPERATIVE stop: tell the orchestrator to interrupt so it breaks at the
        # next step boundary and SAVES resumable state. A hard task.cancel() would
        # abort mid-step and lose "where we were", so the user couldn't continue.
        # Audio is already silenced via suppression, so the stop still feels instant.
        await self._orchestrator.interrupt()

    def _launch(
        self,
        session_id: str,
        coro_factory: Callable[[], Awaitable[dict[str, Any]]],
        ack: str,
        *,
        offer_impl: bool = True,
    ) -> str:
        """Run a slow orchestrator coroutine in the background.

        Returns ``ack`` immediately (spoken right away) so the conversation loop
        is never blocked. When the pipeline finishes it publishes its own
        ``conversation.turn.completed`` with the summary — and, for an
        analysis-only run, the "want me to implement these fixes?" offer.
        """
        async def _run() -> None:
            try:
                state = await coro_factory()
                response = (state or {}).get("final_response", "Done.")

                if offer_impl and self._was_analysis_only(state or {}) and response.strip():
                    self._pending_impl[session_id] = response
                    await self._event_bus.publish(Event(
                        type="action.proposed",
                        payload={
                            "action": "implement_fixes",
                            "prompt": "Want me to go ahead and implement these fixes?",
                        },
                        session_id=session_id,
                    ))
                    response = (
                        f"{response}\n\n---\n\n"
                        "**Want me to go ahead and implement these fixes?** "
                        "Say yes and I'll make the changes and run the tests."
                    )

                await self._memory.store(session_id, MemoryEntry(role="assistant", content=response))
                await self._event_bus.publish(Event(
                    type="conversation.turn.completed",
                    payload={"text": response},
                    session_id=session_id,
                ))
            except asyncio.CancelledError:
                logger.info("background_run_cancelled", session_id=session_id)
            except Exception as e:
                logger.exception("background_run_failed")
                await self._event_bus.publish(Event(
                    type="conversation.turn.completed",
                    payload={"text": friendly_error(e)},
                    session_id=session_id,
                ))

        self._build_tasks[session_id] = asyncio.create_task(_run())
        return ack

    @staticmethod
    def _was_analysis_only(state: dict) -> bool:
        """True if the plan only analyzed code (review) without modifying it."""
        plan = state.get("plan", []) or []
        agents = {step.get("agent_name") for step in plan}
        mutating = {"coding", "executor", "testing"}
        return "review" in agents and not (agents & mutating)

    @staticmethod
    def _format_plan(plan: list[dict]) -> str:
        """Number the plan steps for the user to review (spoken + shown)."""
        lines = []
        for i, step in enumerate(plan, 1):
            desc = (step.get("description") or "").strip()
            if desc:
                lines.append(f"{i}. {desc}")
        return "\n".join(lines)

    async def _run_implementation(self, analysis: str, session_id: str, project_path: str) -> str:
        """Run the full implementation pipeline to act on a prior analysis (in
        the background, so the conversation stays live)."""
        instruction = (
            "Implement the fixes and improvements identified in this review. "
            "Make the actual code changes to the project files, then run the tests "
            "to verify everything works.\n\nReview findings:\n"
            f"{analysis}"
        )
        context_str = await self._context.get_context_for_agent(instruction)
        enriched = f"{instruction}\n\n{context_str}" if context_str else instruction

        return self._launch(
            session_id,
            lambda: self._orchestrator.run(
                user_message=enriched,
                project_path=project_path,
                session_id=session_id,
            ),
            "Great — implementing those fixes now. I'll let you know when it's done.",
            offer_impl=False,
        )

    # ── Intent routing helper ────────────────────────────────────────────────

    async def _route_kind(self, text: str, rule_intent: Intent) -> str:
        """Decide how to handle a turn: chitchat | general | codebase | explain | command.

        Uses the fast chat model so it's robust to natural speech (the old
        rule-based default sent everything to the build pipeline). Falls back to
        a conservative rule on error — biasing toward conversation, never an
        accidental build.
        """
        # Only git is unambiguous enough to short-circuit. EXPLAIN is NOT — the
        # rule classifier fires on the bare word "explain", which wrongly grabs
        # "explain how transformers work" (a general question). Let the LLM
        # router make the explain-my-code vs explain-a-concept call.
        if rule_intent == Intent.GIT:
            return "command"

        try:
            llm = create_chat_llm(get_settings().llm)
            resp = await llm.ainvoke([
                SystemMessage(content=ROUTER_PROMPT),
                HumanMessage(content=text.strip()),
            ])
            word = response_text(resp).strip().lower()
            for k in ("chitchat", "general", "codebase", "explain", "runapp", "command"):
                if k in word:
                    logger.info("intent_routed", kind=k, text=text[:50])
                    return k
        except Exception as e:
            logger.warning("intent_router_failed", error=str(e)[:120])

        # Conservative fallback. "run/serve/preview the app" → runapp first.
        t = text.lower()
        if _wants_preview(t):
            return "runapp"
        strong = (
            "create ", "build ", "implement", "add ", "write ", "fix ", "fix the",
            "refactor", "install", "delete", "remove", "rename", "generate",
            "scaffold", "set up ", "setup ", "deploy", "rewrite", "make a", "make me",
        )
        if any(s in t for s in strong):
            return "command"
        # Is it about THEIR code, or a general concept? Bias non-code questions
        # to "general" (JARVIS answers) rather than a code lookup or walkthrough.
        codeish = ("my code", "my project", "this project", "this file", "the file",
                   "my file", "the function", "in the code", "the codebase", "our code",
                   "app.py", ".py", ".js", ".ts", "main.py")
        explainish = any(p in t for p in EXPLAIN_PHRASES)
        if any(c in t for c in codeish):
            return "explain" if explainish else "codebase"
        if explainish:
            return "general"
        return "chitchat"

    # ── Direct handlers ──────────────────────────────────────────────────────

    async def _handle_explain(self, text: str, session_id: str, project_path: str) -> str:
        """
        Walk the user through code in a Claude Code-style explanation.

        Pulls relevant snippets from the context engine, then calls the chat
        model directly with a focused prompt. Does NOT route through the full
        agent pipeline so we get a fast, conversational answer suitable for voice.
        """
        await self._event_bus.publish(Event(
            type="agent.narration",
            payload={"text": "Sure, let me take a look and walk you through it.", "agent": "rex"},
            session_id=session_id,
        ))

        results = await self._context.search(text, n_results=5)
        if not results:
            return ("I can explain this, but I don't have the file indexed yet. "
                    "Can you tell me which file or function you want me to walk through? "
                    "Or load a project first.")

        context_blob = self._format_excerpts(results)
        try:
            llm = create_chat_llm(get_settings().llm)
            response = await llm.ainvoke([
                SystemMessage(content=EXPLAIN_SYSTEM_PROMPT),
                HumanMessage(content=(
                    f"User asked: {text}\n\n"
                    f"Here is the relevant code I found in their project:\n\n"
                    f"{context_blob}\n\n"
                    f"Please explain it the way you would talk to them in person."
                )),
            ])
            explanation = response_text(response).strip()
            return explanation or "I looked at the code but couldn't put a good explanation together. Want to point me at a specific file?"
        except Exception as e:
            logger.exception("explain_failed")
            return friendly_error(e)

    async def _handle_vision(self, text: str, images: list[str], session_id: str, project_path: str) -> str:
        """Understand image(s) the user shared. If they want it BUILT (a
        screenshot/design to reproduce), turn the image into a detailed spec and
        run it through the real build pipeline — like Claude Code does."""
        await self._event_bus.publish(Event(
            type="agent.narration",
            payload={"text": "Let me take a look at that.", "agent": "rex"},
            session_id=session_id,
        ))

        valid = [img for img in images[:4] if isinstance(img, str) and img.startswith("data:image")]
        if not valid:
            return "That didn't come through as an image I can read — could you try attaching it again?"

        wants_build = _wants_build(text)
        sys_prompt = VISION_BUILD_SPEC_PROMPT if wants_build else VISION_PROMPT
        prompt = text.strip() or (
            "Produce a detailed, implementation-ready spec of this design."
            if wants_build else
            "Take a look at this and tell me what it is and how you can help with it."
        )
        content: list[dict] = [{"type": "text", "text": prompt}]
        content += [{"type": "image_url", "image_url": {"url": img}} for img in valid]

        try:
            llm = create_vision_llm(get_settings().llm)
            resp = await llm.ainvoke([
                SystemMessage(content=sys_prompt),
                HumanMessage(content=content),
            ])
            understanding = response_text(resp).strip()
        except Exception as e:
            logger.exception("vision_failed")
            return friendly_error(e)
        if not understanding:
            return "I can see the image but couldn't read it clearly — could you send a sharper version?"

        if wants_build:
            connected = project_path not in ("", ".", None)
            if not connected:
                self._pending_vision[session_id] = understanding
                return ("I can see exactly what you want me to build. Connect a project folder, "
                        "then say \"build it\" and I'll reproduce it there.")
            instruction = self._image_build_instruction(understanding, text)
            return await self._plan_and_gate(instruction, session_id, project_path, "Got it — I can build this. ")

        # Just describe it — and remember the gist so a follow-up "build it" works.
        self._pending_vision[session_id] = understanding
        return understanding

    async def _handle_document(self, text: str, doc_context: str, session_id: str, project_path: str) -> str:
        """Use an attached document as context: build from it if asked, else
        answer/summarize it."""
        if not doc_context:
            return "I couldn't read anything from that document — is it a supported type (PDF, Word, text, code)?"

        await self._event_bus.publish(Event(
            type="agent.narration",
            payload={"text": "Reading through that document.", "agent": "rex"},
            session_id=session_id,
        ))

        # If they want to build/act on it, feed the doc to the build pipeline.
        kind = await self._route_kind(text, Intent.CONVERSATION) if text.strip() else "general"
        if kind == "command":
            if project_path in ("", ".", None):
                return "Connect a project folder and I'll build this from your document."
            instruction = (
                f"{text}\n\nUse the attached document below as the specification / source of truth:\n\n{doc_context}"
            )
            return await self._plan_and_gate(instruction, session_id, project_path, "Got it — working from your document. ")

        # Otherwise answer about it (summary / Q&A).
        try:
            llm = create_chat_llm(get_settings().llm)
            resp = await llm.ainvoke([
                SystemMessage(content=DOC_QA_PROMPT),
                HumanMessage(content=f"{text or 'Give me a short summary of this document.'}\n\nDocument:\n{doc_context}"),
            ])
            return response_text(resp).strip() or "I read the document but couldn't pull a clear answer — what would you like to know about it?"
        except Exception as e:
            logger.exception("doc_qa_failed")
            return friendly_error(e)

    @staticmethod
    def _image_build_instruction(spec: str, user_text: str) -> str:
        extra = f"\n\nThe user also said: {user_text.strip()}" if user_text.strip() else ""
        return (
            "Build EXACTLY what is shown in the screenshot/design the user provided. Match the "
            "layout, components, visible text, colors, and styling as closely as possible. Create "
            "the real files and implement it fully — don't just describe it.\n\n"
            f"DETAILED SPEC OF THE IMAGE (reproduce this faithfully):\n{spec}{extra}"
        )

    async def _handle_web_question(self, text: str, session_id: str, project_path: str) -> str:
        """Answer a general/world question by LIVE web search, then synthesize a
        spoken answer grounded in the results. Falls back to the model's own
        knowledge (honestly) if search returns nothing.
        """
        # Immediate feedback so the user hears something while we search.
        await self._event_bus.publish(Event(
            type="agent.narration",
            payload={"text": "Let me look that up real quick.", "agent": "rex"},
            session_id=session_id,
        ))

        data = await web_search(text, max_results=5)
        results = data.get("results", [])
        if not results and not data.get("answer"):
            # Search unavailable/empty — fall back to what the model knows, with
            # the chat brain's built-in "as far as I know" honesty.
            logger.info("web_search_empty_fallback", text=text[:60])
            return await self._chat_reply(text, session_id, project_path)

        lines: list[str] = []
        if data.get("answer"):
            lines.append(f"Search summary: {data['answer']}")
        for r in results[:5]:
            src = source_name(r.get("url", "")) or "web"
            title = (r.get("title") or "").strip()
            snippet = (r.get("snippet") or "").strip()
            if len(snippet) > 500:
                snippet = snippet[:500] + "…"
            lines.append(f"- [{src}] {title}: {snippet}")
        blob = "\n".join(lines)

        try:
            llm = create_chat_llm(get_settings().llm)
            resp = await llm.ainvoke([
                SystemMessage(content=WEB_QA_PROMPT),
                HumanMessage(content=(
                    f"Question: {text}\n\n"
                    f"Live web search results (most recent first):\n{blob}\n\n"
                    f"Answer the question using these results."
                )),
            ])
            answer = response_text(resp).strip()
            return answer or "I searched but couldn't pull together a clear answer — want me to try rephrasing it?"
        except Exception as e:
            logger.exception("web_qa_failed")
            return friendly_error(e)

    async def _handle_run_preview(self, session_id: str, project_path: str) -> str:
        """Start the project's dev server as a live preview and surface its URL to
        the Preview tab (Claude-Code / Replit style)."""
        connected = project_path not in ("", ".", None)
        if not connected:
            return ("Connect a project folder first, then I'll start it up and show you "
                    "a live preview right here.")

        await self._event_bus.publish(Event(
            type="agent.narration",
            payload={"text": "Starting it up — give me a few seconds.", "agent": "rex"},
            session_id=session_id,
        ))

        try:
            res = await start_preview(session_id, project_path)
        except Exception as e:
            logger.exception("preview_start_failed")
            return friendly_error(e)

        if res.get("ok"):
            url = res["url"]
            # Tell the frontend to load it in the Preview tab.
            await self._event_bus.publish(Event(
                type="preview.ready",
                payload={"url": url, "command": res.get("command", "")},
                session_id=session_id,
            ))
            note = " (couldn't confirm the exact port, so this is the usual one — tell me if it's off)" if res.get("guessed") else ""
            return (
                f"It's running — I started it with `{res.get('command')}` and it's live at "
                f"{url}{note}. I've opened it in the Preview tab on the right."
            )

        err = res.get("error", "I couldn't start it.")
        extra = ""
        if res.get("output"):
            extra = f" Here's the tail of what it printed:\n\n{res['output'][:600]}"
        return f"I tried to run it, but {err}{extra} Want me to dig in and fix what's stopping it?"

    async def _handle_question(self, text: str, session_id: str, project_path: str) -> str:
        """Answer a question about the codebase — grounded in the REAL files on
        disk (read live), plus the indexed code. Reading the live filesystem is
        what lets Rex see folders/files (e.g. a Tetris subfolder) that the vector
        index may have missed or that were added after indexing.
        """
        connected = project_path not in ("", ".", None)
        if not connected:
            return (
                "I want to actually check before I answer, but no project is connected yet. "
                "Connect a folder and I'll read the real code, then tell you for sure."
            )

        # LIVE filesystem view — the source of truth.
        live = self._live_project_view(project_path, text)

        # Best-effort: also pull semantically-relevant chunks from the index.
        try:
            results = await self._context.search(text, n_results=6)
        except Exception:
            results = []
        excerpts = self._format_excerpts(results) if results else "(none indexed)"

        try:
            llm = create_chat_llm(get_settings().llm)
            response = await llm.ainvoke([
                SystemMessage(content=GROUNDED_QA_PROMPT),
                HumanMessage(content=(
                    f"Question: {text}\n\n"
                    f"LIVE project file structure — the real, current files on disk "
                    f"(this is authoritative; trust it over the index):\n{live['tree']}\n\n"
                    f"Relevant file contents:\n{live['files']}\n\n"
                    f"Additional indexed code excerpts:\n{excerpts}\n\n"
                    f"Answer using the real files above. If the answer is about which "
                    f"files/folders exist, rely on the live file structure."
                )),
            ])
            answer = response_text(response).strip()
            return answer or "I looked at the project files but couldn't pin down an answer — which file or folder should I focus on?"
        except Exception as e:
            logger.exception("question_answer_failed")
            return friendly_error(e)

    @staticmethod
    def _live_project_view(project_path: str, query: str) -> dict:
        """Read the REAL filesystem (recursive) so answers reflect what's on disk
        right now. Returns {"tree": <file list>, "files": <relevant contents>}."""
        skip = {
            ".git", "node_modules", "__pycache__", ".venv", "venv", "env", ".next",
            "dist", "build", ".mypy_cache", ".pytest_cache", ".idea", ".vscode",
            ".ruff_cache", "site-packages", ".turbo", ".cache",
        }
        rels: list[str] = []
        try:
            for dirpath, dirnames, filenames in os.walk(project_path):
                dirnames[:] = [d for d in dirnames if d not in skip and not d.startswith(".")]
                for f in filenames:
                    rel = os.path.relpath(os.path.join(dirpath, f), project_path).replace("\\", "/")
                    rels.append(rel)
                if len(rels) >= 600:
                    break
        except Exception:
            return {"tree": "(couldn't read the folder)", "files": ""}
        rels.sort()
        tree = "\n".join(rels) if rels else "(the folder is empty)"

        # Read files whose path matches the question's keywords (or a few top-level
        # code files as a fallback), capped so we don't blow up the prompt.
        keywords = [w for w in re.findall(r"[a-z0-9_]+", query.lower()) if len(w) >= 3]
        picked = [r for r in rels if any(k in r.lower() for k in keywords)][:8]
        if not picked:
            picked = [r for r in rels if "/" not in r and r.rsplit(".", 1)[-1]
                      in ("py", "js", "ts", "tsx", "jsx", "md", "txt", "json", "html", "css")][:6]

        blobs, budget = [], 12000
        for rel in picked:
            full = os.path.join(project_path, rel.replace("/", os.sep))
            try:
                if os.path.getsize(full) > 20000:
                    continue
                with open(full, encoding="utf-8", errors="replace") as fh:
                    content = fh.read()[:2500]
            except Exception:
                continue
            blobs.append(f"--- {rel} ---\n{content}")
            budget -= len(content)
            if budget <= 0:
                break
        return {"tree": tree, "files": "\n\n".join(blobs) if blobs else "(no files read)"}

    @staticmethod
    def _format_excerpts(results: list[dict]) -> str:
        """Build a compact, labelled context blob from retrieved code chunks."""
        lines: list[str] = []
        for r in results[:6]:
            label = r.get("file_path", "unknown")
            fn = r.get("function_name") or ""
            cls = r.get("class_name") or ""
            if fn:
                label += f" :: {fn}"
            elif cls:
                label += f" :: {cls}"
            snippet = (r.get("content") or "").strip()
            if snippet:
                if len(snippet) > 1200:
                    snippet = snippet[:1200] + "\n# ...truncated..."
                lines.append(f"--- {label} ---\n{snippet}")
        return "\n\n".join(lines) or "(no relevant code found)"

    # ── Instant answers (no LLM, no pipeline) ────────────────────────────────

    def _quick_answer(self, text: str, project_path: str) -> str | None:
        """Instant, no-LLM answers for status/meta/file-listing questions.

        Returns None if the turn isn't one of these — so we stay snappy on the
        things that don't need a model at all (and never build to answer them).
        """
        t = text.lower().strip()
        connected = project_path not in ("", ".", None)
        name = os.path.basename(project_path.rstrip("/\\")) if connected else ""

        # "is a folder connected? which project are we in?"
        status_phrases = (
            "connected folder", "folder connected", "project connected", "connected project",
            "which folder", "what folder", "which project", "what project", "any folder",
            "a folder connected", "folder am i", "folder are we", "is anything connected",
            "what's connected", "whats connected", "connected to", "current folder",
            "current project", "working folder", "working directory", "which directory",
        )
        if any(p in t for p in status_phrases):
            if connected:
                return (
                    f"Yes — we're connected to the '{name}' project, and I'll do everything "
                    f"inside that folder. Want me to look at something in it?"
                )
            return (
                "No project folder is connected yet. Hit 'Connect a project folder', pick one, "
                "and I'll work right inside it."
            )

        # "what files are here? how many files? list the files" → just read the
        # directory and answer (the Claude-Code `ls`), no model, no build.
        listing = self._file_listing_answer(t, project_path, connected, name)
        if listing is not None:
            return listing

        # "what can you do?"
        capability_phrases = (
            "what can you do", "what do you do", "who are you", "what are you",
            "your capabilities", "how can you help", "what can you help",
        )
        if any(p in t for p in capability_phrases):
            return (
                "I'm Rex, your voice coding partner. Connect a project folder and I can build "
                "features, write and edit code, run commands and tests, review for bugs, and "
                "explain how things work — just talk to me like a teammate. What should we start with?"
            )
        return None

    def _file_listing_answer(
        self, t: str, project_path: str, connected: bool, name: str
    ) -> str | None:
        """Answer 'what/how many files are here' by listing the real directory."""
        triggers = (
            "how many file", "what file", "list the file", "list file", "list all file",
            "files present", "files are there", "files in the", "any files", "any file ",
            "what's in the folder", "whats in the folder", "what is in the folder",
            "what's in the project", "files do we have", "files are present",
            "show me the file", "show the file", "what files", "files there",
        )
        if not any(p in t for p in triggers):
            return None

        if not connected:
            return (
                "No project folder is connected yet, so there's nothing for me to list. "
                "Connect a folder and I'll tell you exactly what's in it."
            )

        files, dirs = self._scan_top_level(project_path)
        if not files and not dirs:
            return f"The '{name}' folder looks empty — I don't see any files in it."

        n = len(files)
        head = f"The '{name}' folder has {n} file{'s' if n != 1 else ''}"
        if dirs:
            head += f" and {len(dirs)} folder{'s' if len(dirs) != 1 else ''}"
        head += "."
        if files:
            shown = ", ".join(files[:12])
            tail = "." if n <= 12 else f", plus {n - 12} more."
            head += f" The files are: {shown}{tail}"
        if dirs:
            head += f" Folders: {', '.join(dirs[:8])}."
        return head

    @staticmethod
    def _scan_top_level(project_path: str) -> tuple[list[str], list[str]]:
        """Top-level files and folders in the project, skipping build/VCS noise."""
        files: list[str] = []
        dirs: list[str] = []
        try:
            with os.scandir(project_path) as it:
                for entry in it:
                    try:
                        if entry.is_dir():
                            if entry.name not in _SCAN_SKIP_DIRS:
                                dirs.append(entry.name)
                        elif entry.is_file():
                            files.append(entry.name)
                    except OSError:
                        continue
        except Exception:
            return [], []
        files.sort()
        dirs.sort()
        return files, dirs

    # ── Conversational replies ───────────────────────────────────────────────

    async def _chat_reply(self, text: str, session_id: str, project_path: str) -> str:
        """Warm, two-way conversational reply via the fast chat model (Groq)."""
        connected = project_path not in ("", ".", None)
        ctx = (
            f" They're currently working in the '{os.path.basename(project_path.rstrip('/\\'))}' project."
            if connected else " No project folder is connected yet."
        )

        # Pull recent history so the chat is genuinely two-way (it remembers what
        # was just said). The current user turn is already stored, so it's the
        # last entry — no need to append it again.
        messages: list = [SystemMessage(content=CHAT_SYSTEM_PROMPT + ctx)]
        try:
            history = await self._memory.retrieve(session_id, limit=8)
            for entry in history:
                if entry.role == "assistant":
                    messages.append(AIMessage(content=entry.content))
                else:
                    messages.append(HumanMessage(content=entry.content))
        except Exception:
            messages.append(HumanMessage(content=text))

        try:
            llm = create_chat_llm(get_settings().llm)
            response = await llm.ainvoke(messages)
            reply = response_text(response).strip()
            return reply or "I'm right here! What would you like to do?"
        except Exception as e:
            logger.warning("chat_reply_failed", error=str(e)[:120])
            return self._handle_conversation(text)  # rule-based fallback

    def _handle_conversation(self, text: str) -> str:
        """Rule-based fallback conversational responses — friendly and warm."""
        lower = text.lower()

        if any(w in lower for w in ["thanks", "thank you", "great", "perfect", "awesome"]):
            return "Happy to help! I'm here whenever you need me. What's next?"
        if any(w in lower for w in ["yes", "yeah", "yep", "correct", "right"]):
            return "Awesome, let's keep going! What would you like me to do next?"
        if any(w in lower for w in ["no", "nope", "nah"]):
            return "No worries at all! Tell me what you'd prefer and I'll get right on it."
        if any(w in lower for w in ["hello", "hi", "hey"]):
            return "Hey there! Great to have you. What are we building today?"
        if any(w in lower for w in ["how are you", "what's up"]):
            return "I'm doing great, thanks for asking! Ready to build something awesome with you."
        if any(w in lower for w in ["help", "confused", "stuck", "don't know"]):
            return "No worries, I've got you! Just describe what you're trying to build, even roughly, and I'll figure out the rest. You can also ask me to debug, review code, or set up a project."
        return "I'm right here! Just tell me what you'd like to build, fix, or explore."


# ── Confirmation helpers ─────────────────────────────────────────────────────

_AFFIRMATIVE = (
    "yes", "yeah", "yep", "yup", "sure", "go ahead", "go for it", "do it",
    "please do", "proceed", "implement", "fix it", "fix them", "make the change",
    "make the changes", "sounds good", "let's do it", "lets do it", "okay do",
    "ok do", "absolutely", "please implement",
)
_NEGATIVE = (
    "no thanks", "not now", "nope", "nah", "don't", "do not", "leave it",
    "skip", "cancel", "stop", "later", "not yet",
)
_STOP = {"stop", "stop it", "wait", "cancel", "hold on", "nevermind", "never mind",
         "pause", "quiet", "shut up", "be quiet", "enough"}


def _is_affirmative(text: str) -> bool:
    t = text.strip().lower()
    if t in {"no", "nope", "nah"}:
        return False
    if any(p in t for p in _NEGATIVE):
        return False
    return any(p in t for p in _AFFIRMATIVE)


def _is_negative(text: str) -> bool:
    t = text.strip().lower()
    if t in {"no", "nope", "nah"}:
        return True
    return any(p in t for p in _NEGATIVE)


def _is_clean_confirmation(text: str) -> bool:
    """A *clean* yes is short and carries no extra instruction.

    "yes", "yes please", "go ahead", "yeah do it" → clean (run the plan).
    "yes but I just wanted you to check the files…" → NOT clean: it carries a
    different/narrower ask, so we re-understand it as a fresh turn instead of
    blindly running the stored plan.
    """
    return len(text.split()) <= 6


def _is_stop(text: str) -> bool:
    """A spoken barge-in that means 'stop now' (not just a casual 'wait a sec')."""
    t = text.strip().lower().rstrip(".!? ")
    return t in _STOP


_RUN_VERBS = ("run", "start", "serve", "launch", "spin up", "boot", "fire up", "open up", "bring up")
_APP_NOUNS = ("app", "application", "server", "project", "site", "website", "frontend",
              "dev server", "locally", "the thing", "preview")


def _wants_preview(text: str) -> bool:
    """Deterministic fallback: does this clearly mean 'run/serve the app so I can see it'?"""
    t = text.lower()
    if "preview" in t and not any(s in t for s in ("stop", "close", "hide")):
        return True
    # Don't mistake "run the tests" for running the app.
    if "test" in t and not any(n in t for n in ("app", "server", "site", "project")):
        return False
    return any(v in t for v in _RUN_VERBS) and any(n in t for n in _APP_NOUNS)


def _wants_build(text: str) -> bool:
    """In an image context, does the user want it built/reproduced?"""
    t = text.lower()
    cues = (
        "build", "make this", "make it", "create this", "create the", "recreate", "re-create",
        "implement", "clone", "replicate", "reproduce", "rebuild", "code this", "code it",
        "turn this into", "turn it into", "like this", "exactly like", "same as this",
        "this exact", "develop this", "make me this", "build me",
    )
    return any(c in t for c in cues)


def _wants_continue(text: str) -> bool:
    """User wants to resume a paused/ongoing task ('continue', 'keep going')."""
    t = text.strip().lower().rstrip(".!? ")
    phrases = (
        "continue", "keep going", "carry on", "go on", "resume", "pick up where",
        "where you left off", "keep working", "finish it", "finish the", "carry on with",
        "continue with", "continue from", "proceed with the", "keep at it",
    )
    return any(p in t for p in phrases)


def _wants_stop_preview(text: str) -> bool:
    """'stop/shut down/kill the server/preview/app'."""
    t = text.lower()
    stop_verbs = ("stop", "shut down", "shutdown", "kill", "close", "turn off", "take down")
    nouns = ("server", "preview", "app", "application", "site", "dev server", "serving")
    return any(s in t for s in stop_verbs) and any(n in t for n in nouns)
