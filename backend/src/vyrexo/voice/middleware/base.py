"""Voice Middleware — Composable processing chain for voice input/output."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from vyrexo.voice.stt.base import TranscriptionResult
from vyrexo.voice.tts.base import VoiceConfig


@dataclass
class VoiceContext:
    """Context passed through the middleware chain."""

    session_id: str = ""
    is_executing: bool = False
    emotion: str = "neutral"
    mode: str = "normal"
    metadata: dict[str, Any] = field(default_factory=dict)


class VoiceMiddleware(ABC):
    """
    Abstract base for voice middleware.

    Middleware processes both input (after STT) and output (before TTS).
    Return None from process_input to swallow/discard the transcript.
    Return None from process_output to suppress the narration.

    Phase 2 hooks:
    - EmotionMiddleware: tags emotional state
    - InterruptMiddleware: detects interruption during execution
    - ToneAdapter: adjusts output verbosity based on emotion
    """

    @abstractmethod
    async def process_input(
        self, transcript: TranscriptionResult, context: VoiceContext
    ) -> TranscriptionResult | None:
        """Process incoming transcript. Return None to discard."""
        ...

    @abstractmethod
    async def process_output(
        self, text: str, context: VoiceContext
    ) -> str | None:
        """Process outgoing text before TTS. Return None to suppress."""
        ...
