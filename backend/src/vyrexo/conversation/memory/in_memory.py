"""InMemoryStore — Simple list-based memory for MVP."""

from __future__ import annotations

from vyrexo.conversation.memory.base import MemoryEntry, MemoryStore


class InMemoryStore(MemoryStore):
    """MVP memory: stores conversation turns in a dict of lists. Cleared on restart."""

    def __init__(self) -> None:
        self._store: dict[str, list[MemoryEntry]] = {}

    async def store(self, session_id: str, entry: MemoryEntry) -> None:
        self._store.setdefault(session_id, []).append(entry)

    async def retrieve(
        self, session_id: str, query: str | None = None, limit: int = 20
    ) -> list[MemoryEntry]:
        entries = self._store.get(session_id, [])
        # MVP: no semantic search, just return recent entries
        return entries[-limit:]

    async def get_context_window(
        self, session_id: str, max_entries: int = 50
    ) -> list[MemoryEntry]:
        entries = self._store.get(session_id, [])
        return entries[-max_entries:]

    async def clear(self, session_id: str) -> None:
        self._store.pop(session_id, None)
