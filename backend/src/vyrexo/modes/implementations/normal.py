"""NormalMode — Default interaction mode. Fully implemented for MVP."""

from vyrexo.modes.base import AgentResponse, InteractionMode
from vyrexo.voice.stt.base import TranscriptionResult
from vyrexo.voice.tts.base import VoiceConfig


class NormalMode(InteractionMode):
    """Default mode: all input goes to agents, all output is narrated."""

    name = "normal"

    def should_process_input(self, transcript: TranscriptionResult) -> bool:
        return True

    def filter_agent_response(self, response: AgentResponse) -> AgentResponse | None:
        return response

    def get_voice_config(self) -> VoiceConfig:
        return VoiceConfig()
