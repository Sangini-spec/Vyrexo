"""Session repository — CRUD operations for sessions."""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vyrexo.storage.models import Session


class SessionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, project_path: str, project_name: str = "") -> Session:
        session = Session(
            id=uuid.uuid4().hex,
            project_path=project_path,
            project_name=project_name or project_path.split("/")[-1],
            status="active",
            mode="normal",
        )
        self._db.add(session)
        await self._db.flush()
        return session

    async def ensure(
        self, session_id: str, project_path: str = "", project_name: str = ""
    ) -> Session:
        """Get the session by its (frontend-supplied) id, creating the row if it
        doesn't exist yet. Used so conversation turns always have a parent row
        for the FK, and to record/refresh the connected project on connect."""
        session = await self.get(session_id)
        if session is None:
            session = Session(
                id=session_id,
                project_path=project_path,
                project_name=project_name or (os.path.basename(project_path.rstrip("/\\")) if project_path else ""),
                status="active",
                mode="normal",
            )
            self._db.add(session)
            await self._db.flush()
        elif project_path and session.project_path != project_path:
            session.project_path = project_path
            session.project_name = project_name or os.path.basename(project_path.rstrip("/\\"))
            session.updated_at = datetime.now(timezone.utc)
        return session

    async def create_full(
        self, session_id: str, user_id: str, name: str = "New Session", icon: str | None = None
    ) -> Session:
        """Create a sidebar session row with the frontend-supplied id + owner."""
        session = Session(
            id=session_id,
            user_id=user_id or None,
            name=name or "New Session",
            icon=icon,
            project_path="",
            status="active",
            mode="normal",
        )
        self._db.add(session)
        await self._db.flush()
        return session

    async def rename(self, session_id: str, name: str) -> None:
        session = await self.get(session_id)
        if session:
            session.name = name
            session.updated_at = datetime.now(timezone.utc)

    async def set_icon(self, session_id: str, icon: str) -> None:
        session = await self.get(session_id)
        if session:
            session.icon = icon
            session.updated_at = datetime.now(timezone.utc)

    async def delete(self, session_id: str) -> None:
        session = await self.get(session_id)
        if session:
            await self._db.delete(session)  # cascades to turns + actions

    async def get(self, session_id: str) -> Session | None:
        result = await self._db.execute(select(Session).where(Session.id == session_id))
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: str, limit: int = 100) -> list[Session]:
        """Sessions owned by this user, most-recently-updated first."""
        result = await self._db.execute(
            select(Session)
            .where(Session.user_id == user_id)
            .order_by(Session.updated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_all(self, limit: int = 50) -> list[Session]:
        result = await self._db.execute(
            select(Session).order_by(Session.updated_at.desc()).limit(limit)
        )
        return list(result.scalars().all())

    async def update_status(self, session_id: str, status: str) -> None:
        session = await self.get(session_id)
        if session:
            session.status = status
            session.updated_at = datetime.now(timezone.utc)

    async def update_mode(self, session_id: str, mode: str) -> None:
        session = await self.get(session_id)
        if session:
            session.mode = mode
            session.updated_at = datetime.now(timezone.utc)
