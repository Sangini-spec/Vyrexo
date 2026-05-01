"""Emotion Middleware — Basic vocal tone analysis using audio features."""

import structlog

from vyrexo.events.bus import Event, EventBus
from vyrexo.voice.middleware.base import VoiceContext, VoiceMiddleware
from vyrexo.voice.stt.base import TranscriptionResult

logger = structlog.get_logger()


class EmotionMiddleware(VoiceMiddleware):
    """
    Analyzes vocal tone and tags the transcript with detected emotion.

    MVP: Uses simple text-based heuristics (question marks, exclamations,
    short/curt responses).

    Phase 2: Will integrate librosa audio feature analysis
    (speech rate, pitch variance, volume patterns, pause frequency).
    """

    def __init__(self, event_bus: EventBus) -> None:
        self._event_bus = event_bus

    async def process_input(
        self, transcript: TranscriptionResult, context: VoiceContext
    ) -> TranscriptionResult | None:
        text = transcript.text.strip()
        emotion = self._detect_emotion(text)

        transcript.metadata["emotion"] = emotion
        context.emotion = emotion

        if emotion != "neutral":
            await self._event_bus.publish(Event(
                type="voice.emotion.detected",
                payload={"emotion": emotion, "text": text[:60]},
                session_id=context.session_id,
            ))

        return transcript

    async def process_output(
        self, text: str, context: VoiceContext
    ) -> str | None:
        return text

    def _detect_emotion(self, text: str) -> str:
        """
        Simple text-based emotion detection for MVP.

        Returns: "neutral" | "frustrated" | "confused" | "urgent" | "calm"
        """
        lower = text.lower()

        # Frustrated indicators
        frustrated_words = ["no", "wrong", "stop", "undo", "revert", "why isn't", "not working",
                           "broken", "fix this", "that's wrong"]
        if any(w in lower for w in frustrated_words) or text.count("!") >= 2:
            return "frustrated"

        # Confused indicators
        if text.count("?") >= 2 or lower.startswith(("what", "how", "why", "where", "i don't understand")):
            return "confused"

        # Urgent indicators
        urgent_words = ["quickly", "asap", "hurry", "now", "immediately", "urgent"]
        if any(w in lower for w in urgent_words):
            return "urgent"

        # Very short response = might be curt/frustrated
        if len(text.split()) <= 2 and not text.endswith("?"):
            return "neutral"

        return "neutral"
