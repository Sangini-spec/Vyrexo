"""
Main WebSocket connection handler.

Bridges the EventBus to the frontend — subscribes to event patterns
and forwards relevant events as JSON. Receives audio and text from the client.
"""

from __future__ import annotations

import json
from typing import Any, Callable

import structlog
from fastapi import WebSocket, WebSocketDisconnect

from vyrexo.api.websocket.manager import ConnectionManager
from vyrexo.api.websocket.protocol import ClientMessage, ClientMessageType, ServerMessage, ServerMessageType
from vyrexo.events.bus import Event, EventBus

logger = structlog.get_logger()

# Map EventBus event types -> ServerMessageType for forwarding
EVENT_TO_WS: dict[str, ServerMessageType] = {
    "voice.transcription.partial": ServerMessageType.VOICE_TRANSCRIPTION_PARTIAL,
    "voice.transcription.final": ServerMessageType.VOICE_TRANSCRIPTION_FINAL,
    "voice.output.started": ServerMessageType.VOICE_OUTPUT_START,
    "voice.output.completed": ServerMessageType.VOICE_OUTPUT_END,
    "agent.plan.created": ServerMessageType.AGENT_PLAN,
    "agent.plan.step.started": ServerMessageType.AGENT_STEP_START,
    "agent.plan.step.completed": ServerMessageType.AGENT_STEP_COMPLETE,
    "agent.action.*": ServerMessageType.AGENT_ACTION,
    "agent.conflict": ServerMessageType.AGENT_CONFLICT,
    "agent.narration": ServerMessageType.AGENT_NARRATION,
    "action.proposed": ServerMessageType.ACTION_PROPOSED,
    "execution.command.output": ServerMessageType.EXECUTION_OUTPUT,
    "execution.interrupt.acknowledged": ServerMessageType.EXECUTION_INTERRUPTED,
    "mode.transition": ServerMessageType.MODE_CHANGED,
    "context.file.changed": ServerMessageType.CONTEXT_FILE_CHANGED,
    "project.loaded": ServerMessageType.PROJECT_LOADED,
}

# Patterns to subscribe to on the EventBus
# NOTE: we intentionally subscribe to only `conversation.turn.completed`
# (not the whole conversation.* family) — other conversation events carry
# the *user's* text in their payload, which would echo back as if Rex said it.
FORWARD_PATTERNS = [
    "voice.transcription.*",
    "voice.output.*",
    "agent.*",
    "action.*",
    "execution.*",
    "mode.*",
    "context.file.*",
    "session.*",
    "project.loaded",
    "conversation.turn.completed",
]


class SessionWebSocketHandler:
    """Handles a single WebSocket session."""

    def __init__(
        self,
        event_bus: EventBus,
        connection_manager: ConnectionManager,
    ) -> None:
        self._event_bus = event_bus
        self._conn_mgr = connection_manager
        self._unsubscribers: list[Callable[[], None]] = []
        self._session_id: str = ""

    async def handle(self, websocket: WebSocket, session_id: str) -> None:
        self._session_id = session_id
        await self._conn_mgr.connect(session_id, websocket)

        # Subscribe to event patterns and forward to this client
        for pattern in FORWARD_PATTERNS:
            unsub = self._event_bus.subscribe_pattern(pattern, self._forward_event)
            self._unsubscribers.append(unsub)

        try:
            while True:
                message = await websocket.receive()

                if message.get("type") == "websocket.disconnect":
                    break

                if "text" in message:
                    await self._handle_text(message["text"])
                elif "bytes" in message:
                    await self._handle_audio(message["bytes"])

        except WebSocketDisconnect:
            logger.info("ws_client_disconnected", session_id=session_id)
        except Exception:
            logger.exception("ws_handler_error", session_id=session_id)
        finally:
            self._cleanup()

    async def _handle_text(self, raw: str) -> None:
        """Handle incoming JSON text message from client."""
        try:
            data = json.loads(raw)
            msg = ClientMessage(**data)
        except Exception:
            logger.warning("ws_invalid_message", raw=raw[:200])
            return

        if msg.type == ClientMessageType.TEXT_INPUT:
            await self._event_bus.publish(Event(
                type="conversation.turn.started",
                payload={"text": msg.payload.get("text", ""), "source": "text"},
                session_id=self._session_id,
            ))

        elif msg.type == ClientMessageType.VOICE_START:
            await self._event_bus.publish(Event(
                type="voice.capture.started",
                payload=msg.payload,
                session_id=self._session_id,
            ))

        elif msg.type == ClientMessageType.VOICE_STOP:
            await self._event_bus.publish(Event(
                type="voice.capture.stopped",
                payload={},
                session_id=self._session_id,
            ))

        elif msg.type == ClientMessageType.EXECUTION_INTERRUPT:
            await self._event_bus.publish(Event(
                type="execution.interrupt.requested",
                payload=msg.payload,
                session_id=self._session_id,
            ))

        elif msg.type == ClientMessageType.MODE_SWITCH:
            await self._event_bus.publish(Event(
                type="mode.switch.requested",
                payload=msg.payload,
                session_id=self._session_id,
            ))

        elif msg.type == ClientMessageType.PROJECT_SET:
            await self._event_bus.publish(Event(
                type="project.set.requested",
                payload=msg.payload,
                session_id=self._session_id,
            ))

        elif msg.type == ClientMessageType.VOICE_CONFIG:
            await self._event_bus.publish(Event(
                type="voice.config.requested",
                payload=msg.payload,
                session_id=self._session_id,
            ))

    async def _handle_audio(self, data: bytes) -> None:
        """Handle incoming binary audio chunk from client."""
        await self._event_bus.publish(Event(
            type="voice.audio.chunk",
            payload={"audio": data, "format": "pcm16", "sample_rate": 16000},
            session_id=self._session_id,
        ))

    async def _forward_event(self, event: Event) -> None:
        """Forward an EventBus event to the WebSocket client."""
        if event.session_id and event.session_id != self._session_id:
            return

        # Don't echo the inbound mic audio back to the client
        if event.type == "voice.audio.chunk":
            return

        # Outbound TTS audio chunks are sent as binary WebSocket frames
        # so the browser can decode and play them directly.
        if event.type == "voice.output.chunk":
            audio = event.payload.get("audio")
            if isinstance(audio, (bytes, bytearray)):
                await self._conn_mgr.send_bytes(self._session_id, bytes(audio))
                return
            # If no audio bytes attached, fall through and forward as JSON metadata

        # Strip binary data from payload before JSON serialization
        payload: dict[str, Any] = {
            k: v for k, v in event.payload.items() if not isinstance(v, (bytes, bytearray))
        }

        msg = ServerMessage(
            type=self._resolve_ws_type(event.type),
            id=event.id,
            timestamp=event.timestamp,
            session_id=event.session_id or "",
            payload=payload,
        )

        await self._conn_mgr.send_json(self._session_id, json.loads(msg.to_json()))

    def _resolve_ws_type(self, event_type: str) -> ServerMessageType:
        """Map an EventBus event type to a WebSocket ServerMessageType."""
        # Direct match
        for pattern, ws_type in EVENT_TO_WS.items():
            if pattern == event_type:
                return ws_type

        # Fallback: try to find a matching category
        if event_type.startswith("agent.action."):
            return ServerMessageType.AGENT_ACTION
        if event_type.startswith("execution."):
            return ServerMessageType.EXECUTION_OUTPUT
        if event_type.startswith("conversation."):
            return ServerMessageType.CONVERSATION_TURN_COMPLETED
        if event_type.startswith("session."):
            return ServerMessageType.SESSION_STATE

        return ServerMessageType.ERROR

    def _cleanup(self) -> None:
        for unsub in self._unsubscribers:
            unsub()
        self._unsubscribers.clear()
        self._conn_mgr.disconnect(self._session_id)
