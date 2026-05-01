"""MemoryStore — Abstract base for conversation memory backends."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class MemoryEntry:
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = field(default_factory=dict)


class MemoryStore(ABC):
    """
    Abstract base for conversation memory.

    MVP: InMemoryStore (simple list, cleared on restart).
    Phase 2: PersistentStore (PostgreSQL-backed, cross-session memory).
    """

    @abstractmethod
    async def store(self, session_id: str, entry: MemoryEntry) -> None:
        """Store a conversation turn."""
        ...

    @abstractmethod
    async def retrieve(
        self, session_id: str, query: str | None = None, limit: int = 20
    ) -> list[MemoryEntry]:
        """
        Retrieve conversation history.

        If query is provided, return semantically relevant entries.
        Otherwise, return the most recent entries.
        """
        ...

    @abstractmethod
    async def get_context_window(
        self, session_id: str, max_entries: int = 50
    ) -> list[MemoryEntry]:
        """Get entries for the LLM context window."""
        ...

    @abstractmethod
    async def clear(self, session_id: str) -> None:
        """Clear all memory for a session."""
        ...
