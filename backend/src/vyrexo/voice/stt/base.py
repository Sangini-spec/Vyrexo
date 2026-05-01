"""STT Provider — Abstract base for speech-to-text engines."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator


@dataclass
class AudioChunk:
    data: bytes
    sample_rate: int = 16000
    channels: int = 1
    format: str = "pcm16"


@dataclass
class TranscriptionResult:
    text: str
    confidence: float = 0.0
    language: str = "en"
    is_final: bool = True
    metadata: dict = field(default_factory=dict)


class STTProvider(ABC):
    """Abstract base for speech-to-text providers (Whisper local, Whisper API, etc.)."""

    @abstractmethod
    async def transcribe(self, audio: AudioChunk) -> TranscriptionResult:
        """Transcribe a complete audio buffer."""
        ...

    @abstractmethod
    async def transcribe_stream(
        self, audio_stream: AsyncIterator[AudioChunk]
    ) -> AsyncIterator[TranscriptionResult]:
        """Streaming transcription. Yields partial results as audio arrives."""
        ...

    async def shutdown(self) -> None:
        """Cleanup resources."""
        pass
