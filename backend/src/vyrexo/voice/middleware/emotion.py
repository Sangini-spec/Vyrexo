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
        Text-based emotion detection.

        Returns one of: "neutral" | "frustrated" | "confused" | "urgent" |
        "excited" | "tired" | "satisfied".

        Phase 2 will add librosa-based audio analysis (pitch, speech rate, energy)
        and combine the two signals.
        """
        lower = text.lower()
        words = lower.split()

        # Frustrated indicators (strong signal first)
        frustrated_words = [
            "no", "wrong", "stop", "undo", "revert", "why isn't", "not working",
            "broken", "fix this", "that's wrong", "ugh", "damn", "stupid",
            "annoying", "still broken", "again", "again?", "what the",
        ]
        if any(w in lower for w in frustrated_words) or text.count("!") >= 2:
            return "frustrated"

        # Tired indicators (long sessions, low energy)
        tired_words = [
            "tired", "exhausted", "let's wrap", "finish up", "too long",
            "burned out", "head hurts", "can we stop",
        ]
        if any(w in lower for w in tired_words):
            return "tired"

        # Excited / satisfied
        excited_words = [
            "awesome", "amazing", "love it", "yes!", "perfect", "beautiful",
            "let's go", "fantastic", "exactly", "nailed it",
        ]
        if any(w in lower for w in excited_words) or (text.count("!") == 1 and len(words) <= 6):
            return "excited"

        # Satisfied (calm positive)
        satisfied_words = ["thanks", "thank you", "great", "good", "nice", "cool", "got it"]
        if any(lower.startswith(w) or lower == w for w in satisfied_words):
            return "satisfied"

        # Confused indicators
        confused_phrases = ["i don't understand", "what's going on", "i'm lost", "confused"]
        if text.count("?") >= 2 or any(p in lower for p in confused_phrases):
            return "confused"
        # Question-starters that aren't part of a command often indicate confusion
        if lower.startswith(("what", "how", "why", "where")) and text.endswith("?"):
            return "confused"

        # Urgent indicators
        urgent_words = ["quickly", "asap", "hurry", "now", "immediately", "urgent", "fast"]
        if any(w in lower for w in urgent_words):
            return "urgent"

        return "neutral"
