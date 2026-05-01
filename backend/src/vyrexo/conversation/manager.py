"""
ConversationManager — Processes user turns and routes to appropriate handlers.

This is the central coordinator between voice input and the agent system.
It classifies intent, enriches context, manages memory, and routes requests.
"""

from __future__ import annotations

from typing import Any

import structlog

from vyrexo.agents.orchestrator import AgentOrchestrator
from vyrexo.context.engine import ContextEngine
from vyrexo.conversation.intent import Intent, IntentClassifier
from vyrexo.conversation.memory.base import MemoryEntry, MemoryStore
from vyrexo.events.bus import Event, EventBus
from vyrexo.modes.machine import InteractionStateMachine, ModeState
from vyrexo.voice.stt.base import TranscriptionResult

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
        response = await self._route_intent(intent, meta, text, session_id, project_path)

        # Store assistant response in memory
        await self._memory.store(session_id, MemoryEntry(role="assistant", content=response))

        return response

    async def _route_intent(
        self,
        intent: Intent,
        meta: dict,
        text: str,
        session_id: str,
        project_path: str,
    ) -> str:
        """Route to the appropriate handler based on intent."""

        if intent == Intent.INTERRUPT:
            await self._orchestrator.interrupt()
            return "Got it, I've stopped what I was doing. What would you like instead?"

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

        if intent == Intent.QUESTION:
            return await self._handle_question(text, session_id, project_path)

        if intent == Intent.CONVERSATION:
            return self._handle_conversation(text)

        # COMMAND or GIT — send to agent orchestrator
        if not self._modes.current.should_process_input(
            TranscriptionResult(text=text)
        ):
            return ""

        # Detect emotion and adapt response style
        emotion = transcript.metadata.get("emotion", "neutral")
        emotion_prefix = ""
        if emotion == "frustrated":
            emotion_prefix = "I can see this is frustrating — let me help fix this right away. "
        elif emotion == "confused":
            emotion_prefix = "No worries, let me break this down clearly. "
        elif emotion == "urgent":
            emotion_prefix = "On it right now! "

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
        return f"{emotion_prefix}{response}" if emotion_prefix else response

    async def _handle_question(self, text: str, session_id: str, project_path: str) -> str:
        """Handle questions about the codebase using RAG."""
        results = await self._context.search(text, n_results=3)

        if not results:
            # No indexed codebase — fall back to agent
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

    def _handle_conversation(self, text: str) -> str:
        """Handle simple conversational responses — always friendly and warm."""
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
