"""NoiseGate Middleware — Filters silence and noise from transcriptions."""

from vyrexo.voice.middleware.base import VoiceContext, VoiceMiddleware
from vyrexo.voice.stt.base import TranscriptionResult


class NoiseGateMiddleware(VoiceMiddleware):
    """Drops empty or very short transcriptions (noise, silence, filler)."""

    def __init__(self, min_chars: int = 3) -> None:
        self._min_chars = min_chars

    async def process_input(
        self, transcript: TranscriptionResult, context: VoiceContext
    ) -> TranscriptionResult | None:
        text = transcript.text.strip()

        if len(text) < self._min_chars:
            return None

        # Filter common filler/noise transcriptions
        noise_phrases = {"um", "uh", "hmm", "ah", "oh", "you", "the"}
        if text.lower() in noise_phrases:
            return None

        return transcript

    async def process_output(
        self, text: str, context: VoiceContext
    ) -> str | None:
        return text
