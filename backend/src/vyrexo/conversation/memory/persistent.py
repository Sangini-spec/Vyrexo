"""PersistentMemoryStore — DB-backed conversation memory with a write-through cache.

Each turn is written to the ``conversation_turns`` table AND kept in a per-session
in-memory cache for fast reads. A cold session (e.g. after a server restart) is
lazily hydrated from the DB on first access, so re-opening a session restores its
conversation — the LLM gets the prior context and the frontend can show the
history. Every DB op is best-effort: if the database is unavailable, this degrades
transparently to in-memory-only behaviour (identical to the old InMemoryStore).
"""

from __future__ import annotations

import structlog

from vyrexo.conversation.memory.base import MemoryEntry, MemoryStore
from vyrexo.storage.database import get_db_session
from vyrexo.storage.repositories.conversations import ConversationRepository
from vyrexo.storage.repositories.sessions import SessionRepository

logger = structlog.get_logger()

# How many past turns to load back into context for a session.
_HYDRATE_LIMIT = 200


class PersistentMemoryStore(MemoryStore):
    def __init__(self) -> None:
        self._cache: dict[str, list[MemoryEntry]] = {}
        self._hydrated: set[str] = set()  # sessions whose cache was loaded from the DB

    async def _hydrate(self, session_id: str) -> None:
        """Load a session's history from the DB into the cache once."""
        if session_id in self._hydrated:
            return
        self._hydrated.add(session_id)
        try:
            async with get_db_session() as db:
                turns = await ConversationRepository(db).get_history(session_id, limit=_HYDRATE_LIMIT)
            if turns:
                self._cache[session_id] = [
                    MemoryEntry(
                        role=t.role,
                        content=t.content,
                        timestamp=t.timestamp,
                        metadata=t.metadata_json or {},
                    )
                    for t in turns
                ]
                logger.info("memory_hydrated", session_id=session_id, turns=len(turns))
        except Exception as e:
            logger.warning("memory_hydrate_failed", session_id=session_id, error=str(e)[:120])

    async def store(self, session_id: str, entry: MemoryEntry) -> None:
        await self._hydrate(session_id)
        self._cache.setdefault(session_id, []).append(entry)
        try:
            async with get_db_session() as db:
                # Ensure the parent session row exists (FK), then add the turn.
                await SessionRepository(db).ensure(session_id)
                meta = entry.metadata or {}
                await ConversationRepository(db).add_turn(
                    session_id=session_id,
                    role=entry.role,
                    content=entry.content,
                    intent=meta.get("intent"),
                    emotion=meta.get("emotion"),
                    metadata=meta or None,
                )
        except Exception as e:
            # Keep the cache entry so the live conversation still has context.
            logger.warning("memory_persist_failed", session_id=session_id, error=str(e)[:120])

    async def retrieve(
        self, session_id: str, query: str | None = None, limit: int = 20
    ) -> list[MemoryEntry]:
        await self._hydrate(session_id)
        return self._cache.get(session_id, [])[-limit:]

    async def get_context_window(
        self, session_id: str, max_entries: int = 50
    ) -> list[MemoryEntry]:
        await self._hydrate(session_id)
        return self._cache.get(session_id, [])[-max_entries:]

    async def clear(self, session_id: str) -> None:
        # Drops the in-memory cache only; persisted history stays durable in the DB.
        self._cache.pop(session_id, None)
        self._hydrated.discard(session_id)
