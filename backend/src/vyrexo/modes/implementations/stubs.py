"""
Phase 2 mode stubs.

These are registered in the state machine from day one so transitions
work immediately. Phase 2 fleshes out the logic — no structural changes needed.
"""

from vyrexo.modes.base import AgentResponse, InteractionMode
from vyrexo.voice.stt.base import TranscriptionResult
from vyrexo.voice.tts.base import VoiceConfig


class DebugMode(InteractionMode):
    """Phase 2: Live collaborative debugging via voice."""

    name = "debug"

    def should_process_input(self, transcript: TranscriptionResult) -> bool:
        return True

    def filter_agent_response(self, response: AgentResponse) -> AgentResponse | None:
        return response

    def get_voice_config(self) -> VoiceConfig:
        return VoiceConfig(rate="-10%")  # Slower for clarity during debugging


class RubberDuckMode(InteractionMode):
    """
    Phase 2: AI listens silently, only interjects on logical flaws.

    Stub behavior: suppresses all input from reaching agents.
    Phase 2: Adds flaw detection that selectively passes through.
    """

    name = "rubber_duck"

    def should_process_input(self, transcript: TranscriptionResult) -> bool:
        # Phase 2: Add flaw detection logic here
        return False

    def filter_agent_response(self, response: AgentResponse) -> AgentResponse | None:
        return response

    def get_voice_config(self) -> VoiceConfig:
        return VoiceConfig()


class ShipItMode(InteractionMode):
    """Phase 2: Voice-to-deployment pipeline (test -> lint -> PR -> deploy)."""

    name = "ship_it"

    def should_process_input(self, transcript: TranscriptionResult) -> bool:
        return True

    def filter_agent_response(self, response: AgentResponse) -> AgentResponse | None:
        return response

    def get_voice_config(self) -> VoiceConfig:
        return VoiceConfig(rate="+10%")  # Faster narration during deploy


class WhiteboardMode(InteractionMode):
    """Phase 2: Voice-driven architecture whiteboarding with live diagrams."""

    name = "whiteboard"

    def should_process_input(self, transcript: TranscriptionResult) -> bool:
        return True

    def filter_agent_response(self, response: AgentResponse) -> AgentResponse | None:
        return response

    def get_voice_config(self) -> VoiceConfig:
        return VoiceConfig()
