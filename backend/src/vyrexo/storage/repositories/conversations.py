"""Conversation repository — stores and retrieves conversation turns."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vyrexo.storage.models import ConversationTurn


class ConversationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add_turn(
        self,
        session_id: str,
        role: str,
        content: str,
        intent: str | None = None,
        emotion: str | None = None,
        metadata: dict | None = None,
    ) -> ConversationTurn:
        turn = ConversationTurn(
            id=uuid.uuid4().hex,
            session_id=session_id,
            role=role,
            content=content,
            intent=intent,
            emotion=emotion,
            metadata_json=metadata,
        )
        self._db.add(turn)
        await self._db.flush()
        return turn

    async def get_history(self, session_id: str, limit: int = 50) -> list[ConversationTurn]:
        result = await self._db.execute(
            select(ConversationTurn)
            .where(ConversationTurn.session_id == session_id)
            .order_by(ConversationTurn.timestamp.desc())
            .limit(limit)
        )
        turns = list(result.scalars().all())
        turns.reverse()  # Chronological order
        return turns
