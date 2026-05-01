"""Session management endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter

router = APIRouter(prefix="/sessions", tags=["sessions"])

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
