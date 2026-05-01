"""edge-tts TTS Provider — Free, unlimited Microsoft Neural Voices."""

from __future__ import annotations

import asyncio
from typing import AsyncIterator

import structlog

from vyrexo.voice.tts.base import TTSAudioChunk, TTSProvider, VoiceConfig

logger = structlog.get_logger()

# Curated voice list — best voices by accent and gender
VOICE_PRESETS: dict[str, dict[str, str]] = {
    # American
    "american_male": "en-US-GuyNeural",
    "american_female": "en-US-JennyNeural",
    # British
    "british_male": "en-GB-RyanNeural",
    "british_female": "en-GB-SoniaNeural",
    # Indian
    "indian_male": "en-IN-PrabhatNeural",
    "indian_female": "en-IN-NeerjaNeural",
    # Australian
    "australian_male": "en-AU-WilliamNeural",
    "australian_female": "en-AU-NatashaNeural",
}

DEFAULT_VOICE = "en-US-GuyNeural"


class EdgeTTSProvider(TTSProvider):
    """
    TTS provider using Microsoft Edge's neural voices via edge-tts.

    Free, unlimited, no API key needed. 322 voices across 74 languages.
    Supports rate/pitch/volume customization.
    """

    def __init__(self, default_voice: str = DEFAULT_VOICE) -> None:
        self._default_voice = default_voice
        self._current_task: asyncio.Task | None = None
        self._interrupted = False

    async def synthesize(
        self, text: str, config: VoiceConfig | None = None
    ) -> AsyncIterator[TTSAudioChunk]:
        """Convert text to streaming MP3 audio chunks."""
        import edge_tts

        self._interrupted = False

        voice = config.voice if config else self._default_voice
        rate = config.rate if config else "+0%"
        pitch = config.pitch if config else "+0Hz"
        volume = config.volume if config else "+0%"

        logger.info("tts_synthesize", voice=voice, text=text[:60])

        communicate = edge_tts.Communicate(
            text=text,
            voice=voice,
            rate=rate,
            pitch=pitch,
            volume=volume,
        )

        async for chunk in communicate.stream():
            if self._interrupted:
                logger.info("tts_interrupted")
                break

            if chunk["type"] == "audio":
                yield TTSAudioChunk(
                    data=chunk["data"],
                    format="mp3",
                    sample_rate=24000,
                )

    async def interrupt(self) -> None:
        """Immediately stop current synthesis."""
        self._interrupted = True
        logger.info("tts_interrupt_requested")

    async def get_available_voices(self) -> list[dict]:
        """List all available edge-tts voices."""
        import edge_tts

        voices = await edge_tts.list_voices()
        return [
            {
                "id": v["ShortName"],
                "name": v["FriendlyName"],
                "gender": v["Gender"],
                "locale": v["Locale"],
            }
            for v in voices
        ]

    @staticmethod
    def get_presets() -> dict[str, str]:
        """Get curated voice presets organized by accent + gender."""
        return dict(VOICE_PRESETS)

    async def shutdown(self) -> None:
        self._interrupted = True
        logger.info("tts_shutdown")
