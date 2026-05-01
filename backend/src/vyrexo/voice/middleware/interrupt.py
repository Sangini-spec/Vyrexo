"""Interrupt Middleware — Detects when the user speaks during execution."""

import structlog

from vyrexo.events.bus import Event, EventBus
from vyrexo.voice.middleware.base import VoiceContext, VoiceMiddleware
from vyrexo.voice.stt.base import TranscriptionResult

logger = structlog.get_logger()


class InterruptMiddleware(VoiceMiddleware):
    """
    Detects interruption: user speaking while agents are executing.

    When detected, publishes an interrupt event and tags the transcript
    so the ConversationManager knows this is a redirect.
    """

    def __init__(self, event_bus: EventBus) -> None:
        self._event_bus = event_bus

    async def process_input(
        self, transcript: TranscriptionResult, context: VoiceContext
    ) -> TranscriptionResult | None:
        if context.is_executing:
            logger.info("interrupt_detected", text=transcript.text[:60])

            await self._event_bus.publish(Event(
                type="execution.interrupt.requested",
                payload={
                    "reason": "user_speech",
                    "transcript": transcript.text,
                },
                session_id=context.session_id,
            ))

            # Tag the transcript as an interruption
            transcript.metadata["is_interrupt"] = True

        return transcript

    async def process_output(
        self, text: str, context: VoiceContext
    ) -> str | None:
        return text
