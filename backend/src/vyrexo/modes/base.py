"""InteractionMode — Abstract base for interaction modes (state machine states)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from vyrexo.voice.stt.base import TranscriptionResult
from vyrexo.voice.tts.base import VoiceConfig


@dataclass
class AgentResponse:
    text: str
    artifacts: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


class InteractionMode(ABC):
    """
    Abstract base for interaction modes.

    Each mode controls:
    - Whether input is passed to agents
    - How agent output is filtered before narration
    - Voice configuration (speed, verbosity)

    MVP: NormalMode is fully implemented.
    Phase 2: DebugMode, RubberDuckMode, ShipItMode, WhiteboardMode
             are stubs that become full implementations.
    """

    name: str = ""

    @abstractmethod
    def should_process_input(self, transcript: TranscriptionResult) -> bool:
        """Whether to pass this input to agents. RubberDuck returns False."""
        ...

    @abstractmethod
    def filter_agent_response(self, response: AgentResponse) -> AgentResponse | None:
        """Filter/transform agent output before narration. Return None to suppress."""
        ...

    @abstractmethod
    def get_voice_config(self) -> VoiceConfig:
        """Mode-specific voice settings (speed, verbosity, etc.)."""
        ...

    async def on_enter(self) -> None:
        """Called when transitioning INTO this mode."""
        pass

    async def on_exit(self) -> None:
        """Called when transitioning OUT of this mode."""
        pass
