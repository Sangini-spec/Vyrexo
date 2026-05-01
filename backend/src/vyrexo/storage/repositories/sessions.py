"""Session repository — CRUD operations for sessions."""

from __future__ import annotations

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

    async def get(self, session_id: str) -> Session | None:
        result = await self._db.execute(select(Session).where(Session.id == session_id))
        return result.scalar_one_or_none()

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
