"""
WebSocket protocol — message type definitions shared between frontend and backend.

Text frames carry JSON messages. Binary frames carry audio (PCM16 16kHz mono).
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ── Client -> Server Message Types ───────────────────────────────────────────


class ClientMessageType(str, Enum):
    VOICE_START = "voice.start"
    VOICE_STOP = "voice.stop"
    VOICE_CONFIG = "voice.config"
    TEXT_INPUT = "text.input"
    EXECUTION_INTERRUPT = "execution.interrupt"
    MODE_SWITCH = "mode.switch"
    PROJECT_SET = "project.set"
    SESSION_HEARTBEAT = "session.heartbeat"


class ClientMessage(BaseModel):
    type: ClientMessageType
    id: str = ""
    payload: dict[str, Any] = Field(default_factory=dict)


# ── Server -> Client Message Types ───────────────────────────────────────────


class ServerMessageType(str, Enum):
    # Voice
    VOICE_TRANSCRIPTION_PARTIAL = "voice.transcription.partial"
    VOICE_TRANSCRIPTION_FINAL = "voice.transcription.final"
    VOICE_OUTPUT_START = "voice.output.start"
    VOICE_OUTPUT_END = "voice.output.end"

    # Agents
    AGENT_PLAN = "agent.plan"
    AGENT_STEP_START = "agent.step.start"
    AGENT_STEP_COMPLETE = "agent.step.complete"
    AGENT_ACTION = "agent.action"
    AGENT_CONFLICT = "agent.conflict"
    AGENT_NARRATION = "agent.narration"
    ACTION_PROPOSED = "action.proposed"

    # Execution
    EXECUTION_OUTPUT = "execution.output"
    EXECUTION_INTERRUPTED = "execution.interrupted"

    # Mode
    MODE_CHANGED = "mode.changed"

    # Context / Project
    CONTEXT_FILE_CHANGED = "context.file.changed"
    PROJECT_LOADED = "project.loaded"

    # Conversation
    CONVERSATION_TURN_COMPLETED = "conversation.turn.completed"

    # Session
    SESSION_STATE = "session.state"

    # Error
    ERROR = "error"


class ServerMessage(BaseModel):
    type: ServerMessageType
    id: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    session_id: str = ""
    payload: dict[str, Any] = Field(default_factory=dict)

    def to_json(self) -> str:
        return self.model_dump_json()
