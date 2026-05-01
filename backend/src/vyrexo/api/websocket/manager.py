"""
WebSocket connection lifecycle manager.

Tracks active connections per session and handles cleanup.
"""

from __future__ import annotations

import structlog
from fastapi import WebSocket

logger = structlog.get_logger()


class ConnectionManager:
    """Manages WebSocket connections grouped by session ID."""

    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()

        # Disconnect previous connection for this session if exists
        if session_id in self._connections:
            old_ws = self._connections[session_id]
            try:
                await old_ws.close(code=1000, reason="New connection for this session")
            except Exception:
                pass

        self._connections[session_id] = websocket
        logger.info("ws_connected", session_id=session_id)

    def disconnect(self, session_id: str) -> None:
        self._connections.pop(session_id, None)
        logger.info("ws_disconnected", session_id=session_id)

    def get(self, session_id: str) -> WebSocket | None:
        return self._connections.get(session_id)

    @property
    def active_sessions(self) -> list[str]:
        return list(self._connections.keys())

    async def send_json(self, session_id: str, data: dict) -> bool:
        ws = self._connections.get(session_id)
        if ws is None:
            return False
        try:
            await ws.send_json(data)
            return True
        except Exception:
            self.disconnect(session_id)
            return False

    async def send_bytes(self, session_id: str, data: bytes) -> bool:
        ws = self._connections.get(session_id)
        if ws is None:
            return False
        try:
            await ws.send_bytes(data)
            return True
        except Exception:
            self.disconnect(session_id)
            return False
