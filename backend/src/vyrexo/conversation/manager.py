"""
ConversationManager — Processes user turns and routes to appropriate handlers.

This is the central coordinator between voice input and the agent system.
It classifies intent, enriches context, manages memory, and routes requests.
"""

from __future__ import annotations

from typing import Any

import structlog
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from vyrexo.agents.llm_factory import create_chat_llm, create_llm
from vyrexo.agents.orchestrator import AgentOrchestrator
from vyrexo.config import get_settings
from vyrexo.context.engine import ContextEngine
from vyrexo.conversation.intent import EXPLAIN_PHRASES, GIT_KEYWORDS, Intent, IntentClassifier
from vyrexo.conversation.memory.base import MemoryEntry, MemoryStore
from vyrexo.events.bus import Event, EventBus
from vyrexo.modes.machine import InteractionStateMachine, ModeState
from vyrexo.utils.errors import friendly_error
from vyrexo.utils.llm import response_text
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

CHAT_SYSTEM_PROMPT = """You are Rex, a warm, friendly AI coding companion talking with a developer over voice.

Right now you're just chatting — being a good, personable teammate. Keep it natural and human:
- Reply briefly (1-3 sentences) and conversationally, like a friend. This is spoken aloud, so no markdown, code blocks, or lists.
- Actually respond to what they said — if they answer a question of yours, react to it genuinely before moving on. Real two-way conversation, not scripted lines.
- Be warm and a little playful, never robotic or formal.
- If they seem to want to build, fix, or look at code, gently steer toward it ("want me to jump on that?").
- Don't invent facts about their project or claim you did work you didn't do."""

logger = structlog.get_logger()


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

    async def process_turn(
        self,
        transcript: TranscriptionResult,
        session_id: str,
        project_path: str,
    ) -> str:
        """
        Process a user conversation turn. Returns the response text for TTS.
        """
        text = transcript.text.strip()
        if not text:
            return ""

        logger.info("conversation_turn", text=text[:80], session_id=session_id)

        # Store user message in memory
        await self._memory.store(session_id, MemoryEntry(role="user", content=text))

        # Classify intent
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
        text = transcript.text

        # If we previously offered to implement fixes and are waiting on the
        # user, intercept their answer before normal intent routing.
        pending = self._pending_impl.get(session_id)
        if pending is not None:
            if _is_affirmative(text):
                self._pending_impl.pop(session_id, None)
                return await self._run_implementation(pending, session_id, project_path)
            if _is_negative(text):
                self._pending_impl.pop(session_id, None)
                return "No problem — I'll leave the code as it is. What would you like to do next?"
            # Anything else is a fresh instruction; drop the offer and route it.
            self._pending_impl.pop(session_id, None)

        # Instant, no-LLM answers for status/meta questions ("is a folder
        # connected?", "what can you do?") — keeps the voice snappy.
        quick = self._quick_answer(text, project_path)
        if quick is not None:
            return quick

        if intent == Intent.INTERRUPT:
            await self._orchestrator.interrupt()
            return "Got it, I've stopped what I was doing. What would you like instead?"

        # If we have a paused state from a recent interrupt AND this is a command
        # giving a new direction, resume from where we left off rather than restarting.
        if intent == Intent.COMMAND and self._orchestrator.has_paused_state:
            logger.info("conversation_resume", text=text[:60])
            state = await self._orchestrator.resume(text)
            if state is not None:
                response = state.get("final_response", "Done.")
                return response

        if intent == Intent.MODE_SWITCH:
            target = meta.get("target_mode", "normal")
            try:
                target_mode = ModeState(target)
                success = await self._modes.transition(target_mode)
                if success:
                    return f"Switched to {target} mode."
                else:
                    return f"Can't switch to {target} mode from {self._modes.state.value} mode."
            except ValueError:
                return f"Unknown mode: {target}"

        if intent == Intent.EXPLAIN:
            return await self._handle_explain(text, session_id, project_path)

        # Conversation-first: if it isn't clearly about code or building, hand it
        # to the fast chat brain (Groq) so chit-chat and casual questions stay
        # snappy instead of crawling through the local build pipeline.
        if not self._is_coding_request(text):
            return await self._chat_reply(text, session_id, project_path)

        if intent == Intent.QUESTION:
            return await self._handle_question(text, session_id, project_path)

        # COMMAND or GIT — send to agent orchestrator
        if not self._modes.current.should_process_input(transcript):
            return ""

        # Detect emotion and adapt response style
        emotion = transcript.metadata.get("emotion", "neutral")
        emotion_prefix = ""
        if emotion == "frustrated":
            emotion_prefix = "I hear you, this is annoying. Let me sort it out. "
        elif emotion == "confused":
            emotion_prefix = "Totally fair, let me break this down clearly. "
        elif emotion == "urgent":
            emotion_prefix = "On it right now. "
        elif emotion == "tired":
            emotion_prefix = "Got it. I'll keep this short and just get it done. "
        elif emotion == "excited":
            emotion_prefix = "Love the energy. Let's go. "
        elif emotion == "satisfied":
            emotion_prefix = "Glad to hear that. "

        # Enrich with codebase context
        context_str = await self._context.get_context_for_agent(text)

        enriched_message = text
        if context_str:
            enriched_message = f"{text}\n\n{context_str}"

        # Run the agent pipeline
        state = await self._orchestrator.run(
            user_message=enriched_message,
            project_path=project_path,
            session_id=session_id,
        )

        response = state.get("final_response", "Done.")

        # If the agents only analyzed the code (e.g. a review) without changing
        # it, offer to implement the fixes — Claude-Code style. The user's next
        # "yes" runs the full coder/executor/tester pipeline.
        if self._was_analysis_only(state) and response.strip():
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

        return f"{emotion_prefix}{response}" if emotion_prefix else response

    @staticmethod
    def _was_analysis_only(state: dict) -> bool:
        """True if the plan only analyzed code (review) without modifying it."""
        plan = state.get("plan", []) or []
        agents = {step.get("agent_name") for step in plan}
        mutating = {"coding", "executor", "testing"}
        return "review" in agents and not (agents & mutating)

    async def _run_implementation(self, analysis: str, session_id: str, project_path: str) -> str:
        """Run the full implementation pipeline to act on a prior analysis."""
        await self._event_bus.publish(Event(
            type="agent.narration",
            payload={"text": "Great — let me implement those fixes now.", "agent": "rex"},
            session_id=session_id,
        ))

        instruction = (
            "Implement the fixes and improvements identified in this review. "
            "Make the actual code changes to the project files, then run the tests "
            "to verify everything works.\n\nReview findings:\n"
            f"{analysis}"
        )
        context_str = await self._context.get_context_for_agent(instruction)
        enriched = f"{instruction}\n\n{context_str}" if context_str else instruction

        state = await self._orchestrator.run(
            user_message=enriched,
            project_path=project_path,
            session_id=session_id,
        )
        return state.get("final_response", "Done — I've implemented the fixes.")

    async def _handle_explain(self, text: str, session_id: str, project_path: str) -> str:
        """
        Walk the user through code in a Claude Code-style explanation.

        Pulls relevant snippets from the context engine, then calls Gemini directly
        with a focused explanation prompt. Does NOT route through the full agent
        pipeline so we get a fast, conversational answer suitable for voice.
        """
        # Narrate up front so the user hears something immediately
        await self._event_bus.publish(Event(
            type="agent.narration",
            payload={"text": "Sure, let me take a look and walk you through it.", "agent": "rex"},
            session_id=session_id,
        ))

        # Pull the most relevant code chunks for the question
        results = await self._context.search(text, n_results=5)

        if not results:
            return ("I can explain this, but I don't have the file indexed yet. "
                    "Can you tell me which file or function you want me to walk through? "
                    "Or load a project first.")

        # Build a compact context blob for Gemini
        context_lines: list[str] = []
        for r in results[:5]:
            file_path = r.get("file_path", "unknown")
            fn = r.get("function_name") or ""
            cls = r.get("class_name") or ""
            label = file_path
            if fn:
                label += f" :: {fn}"
            elif cls:
                label += f" :: {cls}"
            snippet = (r.get("content") or "").strip()
            if snippet:
                # Trim to keep prompt small
                if len(snippet) > 1200:
                    snippet = snippet[:1200] + "\n# ...truncated..."
                context_lines.append(f"--- {label} ---\n{snippet}")

        context_blob = "\n\n".join(context_lines) if context_lines else "(no relevant code found)"

        # Use the fast chat model (e.g. Groq) so explanations come back quickly.
        try:
            settings = get_settings()
            llm = create_chat_llm(settings.llm)
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
            if not explanation:
                explanation = "I looked at the code but couldn't put a good explanation together. Want to point me at a specific file?"
            return explanation
        except Exception as e:
            logger.exception("explain_failed")
            return friendly_error(e)

    async def _handle_question(self, text: str, session_id: str, project_path: str) -> str:
        """Handle questions about the codebase using RAG."""
        try:
            results = await self._context.search(text, n_results=3)
        except Exception as e:
            logger.exception("question_search_failed")
            return friendly_error(e)

        if not results:
            # No indexed codebase — fall back to agent (which wraps its own errors)
            state = await self._orchestrator.run(
                user_message=text,
                project_path=project_path,
                session_id=session_id,
            )
            return state.get("final_response", "I don't have enough context to answer that.")

        # Build a response from retrieved context
        parts = []
        for r in results:
            if r["function_name"]:
                parts.append(f"In {r['file_path']}, function `{r['function_name']}`")
            elif r["class_name"]:
                parts.append(f"In {r['file_path']}, class `{r['class_name']}`")
            else:
                parts.append(f"In {r['file_path']}")

        if parts:
            return f"I found relevant code: {'; '.join(parts)}. Would you like me to explain any of these?"

        return "I couldn't find anything matching that in the codebase."

    def _is_coding_request(self, text: str) -> bool:
        """Heuristic: does this turn actually want code/building (→ slow local
        pipeline), or is it conversation (→ fast Groq chat)?"""
        t = text.lower()
        if any(p in t for p in EXPLAIN_PHRASES):
            return True
        if any(kw in t for kw in GIT_KEYWORDS):
            return True
        signals = (
            "create", "build", "make ", "add ", "implement", "write ", "wrote", "generate",
            "scaffold", "set up", "setup", "install", "run ", "execute", "fix", "debug",
            "refactor", "rewrite", "update", "modify", "delete", "remove", "rename",
            "review", "optimi", "deploy", "ship", "endpoint", "function", "class ", "method",
            "module", "file", "component", "api", "database", "schema", "route", "test",
            "bug", "feature", "import", "dependency", "package", "compile", "lint", "script",
            "config", "authentication", "auth ", "jwt", "crud", "where is", "which file",
            "which function", "locate", "find the", "look at the code", "the code",
        )
        return any(s in t for s in signals)

    def _quick_answer(self, text: str, project_path: str) -> str | None:
        """Instant, no-LLM answers for status/meta questions. None if not one."""
        import os

        t = text.lower().strip()
        connected = project_path not in ("", ".", None)
        name = os.path.basename(project_path.rstrip("/\\")) if connected else ""

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

    async def _chat_reply(self, text: str, session_id: str, project_path: str) -> str:
        """Warm, two-way conversational reply via the fast chat model (Groq)."""
        import os

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
