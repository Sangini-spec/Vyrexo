"""
Event type constants — the taxonomy of all events in the system.

New event types can be published without registration.
This module serves as documentation and for IDE autocomplete.
"""


class EventType:
    # ── Voice Events ─────────────────────────────────────────────
    VOICE_AUDIO_CHUNK = "voice.audio.chunk"
    VOICE_TRANSCRIPTION_PARTIAL = "voice.transcription.partial"
    VOICE_TRANSCRIPTION_FINAL = "voice.transcription.final"
    VOICE_OUTPUT_STARTED = "voice.output.started"
    VOICE_OUTPUT_CHUNK = "voice.output.chunk"
    VOICE_OUTPUT_COMPLETED = "voice.output.completed"
    VOICE_EMOTION_DETECTED = "voice.emotion.detected"

    # ── Conversation Events ──────────────────────────────────────
    CONVERSATION_TURN_STARTED = "conversation.turn.started"
    CONVERSATION_TURN_COMPLETED = "conversation.turn.completed"
    CONVERSATION_INTENT_CLASSIFIED = "conversation.intent.classified"
    CONVERSATION_CONTEXT_UPDATED = "conversation.context.updated"

    # ── Agent Events ─────────────────────────────────────────────
    AGENT_PLAN_CREATED = "agent.plan.created"
    AGENT_PLAN_STEP_STARTED = "agent.plan.step.started"
    AGENT_PLAN_STEP_COMPLETED = "agent.plan.step.completed"
    AGENT_ACTION_FILE_WRITE = "agent.action.file_write"
    AGENT_ACTION_FILE_READ = "agent.action.file_read"
    AGENT_ACTION_TERMINAL_EXEC = "agent.action.terminal_exec"
    AGENT_ACTION_GIT_OP = "agent.action.git_op"
    AGENT_CONFLICT = "agent.conflict"
    AGENT_ERROR = "agent.error"
    AGENT_NARRATION = "agent.narration"

    # ── Execution Events ─────────────────────────────────────────
    EXECUTION_COMMAND_STARTED = "execution.command.started"
    EXECUTION_COMMAND_OUTPUT = "execution.command.output"
    EXECUTION_COMMAND_COMPLETED = "execution.command.completed"
    EXECUTION_INTERRUPT_REQUESTED = "execution.interrupt.requested"
    EXECUTION_INTERRUPT_ACKNOWLEDGED = "execution.interrupt.acknowledged"

    # ── Mode Events ──────────────────────────────────────────────
    MODE_TRANSITION = "mode.transition"
    MODE_ENTERED = "mode.entered"
    MODE_EXITED = "mode.exited"

    # ── Context Events ───────────────────────────────────────────
    CONTEXT_INDEX_STARTED = "context.index.started"
    CONTEXT_INDEX_COMPLETED = "context.index.completed"
    CONTEXT_FILE_CHANGED = "context.file.changed"
    CONTEXT_QUERY_RESULT = "context.query.result"

    # ── Session Events ───────────────────────────────────────────
    SESSION_CREATED = "session.created"
    SESSION_RESUMED = "session.resumed"
    SESSION_ENDED = "session.ended"
