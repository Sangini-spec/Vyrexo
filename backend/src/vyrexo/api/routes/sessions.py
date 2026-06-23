"""Session management endpoints — DB-backed so the sidebar list survives
restarts and follows the user's account (not just one browser's localStorage)."""

from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter
from pydantic import BaseModel

from vyrexo.storage.database import get_db_session
from vyrexo.storage.repositories.conversations import ConversationRepository
from vyrexo.storage.repositories.sessions import SessionRepository
from vyrexo.storage.models import Session

router = APIRouter(prefix="/sessions", tags=["sessions"])
logger = structlog.get_logger()


class CreateSessionBody(BaseModel):
    id: str | None = None
    user_id: str = ""
    name: str = "New Session"
    icon: str | None = None


class UpdateSessionBody(BaseModel):
    name: str | None = None
    icon: str | None = None


def _ser(s: Session) -> dict:
    return {
        "id": s.id,
        "name": s.name or "New Session",
        "icon": s.icon,
        "project_name": s.project_name or "",
        "createdAt": int(s.created_at.timestamp() * 1000) if s.created_at else None,
    }


@router.get("")
async def list_sessions(user_id: str = "") -> dict:
    """List the sessions owned by this user (most-recent first)."""
    if not user_id:
        return {"ok": True, "sessions": []}
    try:
        async with get_db_session() as db:
            rows = await SessionRepository(db).list_for_user(user_id)
        return {"ok": True, "sessions": [_ser(s) for s in rows]}
    except Exception as e:
        logger.warning("list_sessions_failed", error=str(e)[:120])
        return {"ok": False, "sessions": [], "error": str(e)[:120]}


@router.post("")
async def create_session(body: CreateSessionBody) -> dict:
    """Create (or adopt) a sidebar session row. Idempotent on the given id, so
    migrating an existing localStorage session just sets its owner/name."""
    sid = body.id or uuid.uuid4().hex
    try:
        async with get_db_session() as db:
            repo = SessionRepository(db)
            existing = await repo.get(sid)
            if existing is None:
                s = await repo.create_full(sid, body.user_id, body.name, body.icon)
            else:
                if body.user_id and not existing.user_id:
                    existing.user_id = body.user_id
                if body.name:
                    existing.name = body.name
                if body.icon and not existing.icon:
                    existing.icon = body.icon
                s = existing
            return {"ok": True, "session": _ser(s)}
    except Exception as e:
        logger.warning("create_session_failed", error=str(e)[:120])
        return {"ok": False, "error": str(e)[:120]}


@router.patch("/{session_id}")
async def update_session(session_id: str, body: UpdateSessionBody) -> dict:
    try:
        async with get_db_session() as db:
            repo = SessionRepository(db)
            if body.name is not None:
                await repo.rename(session_id, body.name)
            if body.icon is not None:
                await repo.set_icon(session_id, body.icon)
        return {"ok": True}
    except Exception as e:
        logger.warning("update_session_failed", error=str(e)[:120])
        return {"ok": False, "error": str(e)[:120]}


@router.delete("/{session_id}")
async def delete_session(session_id: str) -> dict:
    """Delete a session and its conversation history (cascades)."""
    try:
        async with get_db_session() as db:
            await SessionRepository(db).delete(session_id)
        return {"ok": True}
    except Exception as e:
        logger.warning("delete_session_failed", error=str(e)[:120])
        return {"ok": False, "error": str(e)[:120]}


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
    async with get_db_session() as db:
        s = await SessionRepository(db).get(session_id)
    return {"ok": bool(s), "session": _ser(s) if s else None}
