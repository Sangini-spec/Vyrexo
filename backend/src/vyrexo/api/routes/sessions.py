"""Session management endpoints."""

from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter

from vyrexo.storage.database import get_db_session
from vyrexo.storage.repositories.conversations import ConversationRepository

router = APIRouter(prefix="/sessions", tags=["sessions"])
logger = structlog.get_logger()

# In-memory session store for MVP (will be replaced by Supabase queries)
_sessions: dict[str, dict] = {}


@router.post("")
async def create_session(project_path: str = "") -> dict:
    session_id = uuid.uuid4().hex
    _sessions[session_id] = {
        "id": session_id,
        "project_path": project_path,
        "status": "active",
        "mode": "normal",
    }
    return _sessions[session_id]


@router.get("")
async def list_sessions() -> list[dict]:
    return list(_sessions.values())


@router.get("/{session_id}/history")
async def get_session_history(session_id: str, limit: int = 200) -> dict:
    """Return a session's saved conversation turns (chronological), so the
    frontend can restore the chat when the session is re-opened. Degrades to an
    empty list if the DB is unavailable."""
    try:
        async with get_db_session() as db:
            turns = await ConversationRepository(db).get_history(session_id, limit=limit)
        return {
            "ok": True,
            "turns": [
                {
                    "role": t.role,
                    "content": t.content,
                    "timestamp": t.timestamp.isoformat() if t.timestamp else None,
                }
                for t in turns
            ],
        }
    except Exception as e:
        logger.warning("session_history_failed", session_id=session_id, error=str(e)[:120])
        return {"ok": True, "turns": []}


@router.get("/{session_id}")
async def get_session(session_id: str) -> dict:
    if session_id not in _sessions:
        return {"error": "Session not found"}
    return _sessions[session_id]


@router.delete("/{session_id}")
async def end_session(session_id: str) -> dict:
    if session_id in _sessions:
        _sessions[session_id]["status"] = "ended"
    return {"status": "ok"}
