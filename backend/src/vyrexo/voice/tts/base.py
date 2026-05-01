"""TTS Provider — Abstract base for text-to-speech engines."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator


@dataclass
class VoiceConfig:
    voice: str = "en-US-GuyNeural"
    rate: str = "+0%"
    pitch: str = "+0Hz"
    volume: str = "+0%"


@dataclass
class TTSAudioChunk:
    data: bytes
    format: str = "mp3"
    sample_rate: int = 24000


class TTSProvider(ABC):
    """Abstract base for text-to-speech providers (edge-tts, Chatterbox, pyttsx3)."""

    @abstractmethod
    async def synthesize(
        self, text: str, config: VoiceConfig | None = None
    ) -> AsyncIterator[TTSAudioChunk]:
        """Convert text to streaming audio chunks."""
        ...

    @abstractmethod
    async def interrupt(self) -> None:
        """Immediately stop current synthesis. Called on user interruption."""
        ...

    async def get_available_voices(self) -> list[dict]:
        """List available voices. Override per provider."""
        return []

    async def shutdown(self) -> None:
        """Cleanup resources."""
        pass
