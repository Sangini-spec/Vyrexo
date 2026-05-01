"""
ContextEngine — Main interface for codebase awareness.

Ties together the Indexer (writes to Chroma), Retriever (reads from Chroma),
and FileWatcher (triggers re-indexing on changes). This is what agents and
the ConversationManager use to answer questions like "where is the auth logic?"
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import structlog

from vyrexo.context.indexer import CodebaseIndexer
from vyrexo.context.retriever import ContextRetriever
from vyrexo.context.watcher import FileWatcher
from vyrexo.events.bus import Event, EventBus

logger = structlog.get_logger()


class ContextEngine:
    """
    Codebase context engine — indexes, watches, and retrieves code context.

    Usage:
        engine = ContextEngine(event_bus, persist_dir="~/.vyrexo/chroma")
        await engine.load_project("/path/to/project")
        results = await engine.search("where is the authentication logic?")
    """

    def __init__(self, event_bus: EventBus, persist_dir: str = "") -> None:
        self._event_bus = event_bus
        self._persist_dir = persist_dir
        self._indexer = CodebaseIndexer(persist_dir=persist_dir)
        self._retriever = ContextRetriever(persist_dir=persist_dir)
        self._watcher = FileWatcher(on_change=self._on_file_change)
        self._project_path: str = ""
        self._project_id: str = ""

    async def load_project(self, project_path: str) -> dict:
        """
        Load and index a project directory.

        1. Indexes all supported files into Chroma
        2. Starts watching for file changes
        3. Returns indexing stats
        """
        self._project_path = str(Path(project_path).resolve())
        self._project_id = hashlib.md5(self._project_path.encode()).hexdigest()[:12]

        logger.info("context_loading_project", path=self._project_path)

        await self._event_bus.publish(Event(
            type="context.index.started",
            payload={"project_path": self._project_path},
        ))

        # Index the project
        stats = await self._indexer.index_project(self._project_path, self._project_id)

        await self._event_bus.publish(Event(
            type="context.index.completed",
            payload=stats,
        ))

        # Start watching for changes
        await self._watcher.start(self._project_path)

        logger.info("context_project_loaded", **stats)
        return stats

    async def search(
        self,
        query: str,
        n_results: int = 5,
        file_filter: str | None = None,
        language_filter: str | None = None,
    ) -> list[dict[str, Any]]:
        """Search the codebase for relevant code chunks."""
        if not self._project_id:
            return []

        results = await self._retriever.search(
            query=query,
            project_id=self._project_id,
            n_results=n_results,
            file_filter=file_filter,
            language_filter=language_filter,
        )

        await self._event_bus.publish(Event(
            type="context.query.result",
            payload={"query": query, "results_count": len(results)},
        ))

        return results

    async def get_file_list(self) -> list[dict]:
        """Get a summary of all indexed files."""
        if not self._project_id:
            return []
        return await self._retriever.get_file_summary(self._project_id)

    async def get_context_for_agent(self, task_description: str, max_chunks: int = 10) -> str:
        """
        Build a context string for an agent based on the task.

        Returns relevant code snippets that the agent can use to understand
        the existing codebase before making changes. No artificial character
        limit — returns as much relevant context as found.
        """
        if not self._project_id:
            return ""

        results = await self.search(task_description, n_results=max_chunks)

        if not results:
            return ""

        context_parts = ["Here is relevant existing code from the project:\n"]
        for r in results:
            context_parts.append(f"--- {r['file_path']} (relevance: {r['relevance']}) ---")
            context_parts.append(r["content"])
            context_parts.append("")

        return "\n".join(context_parts)

    async def _on_file_change(self, change_type: str, file_path: str) -> None:
        """Handle file system changes — trigger incremental re-indexing."""
        logger.info("context_file_changed", change=change_type, file=file_path)

        await self._event_bus.publish(Event(
            type="context.file.changed",
            payload={"change_type": change_type, "file_path": file_path},
        ))

        # Re-index the entire project (simple for MVP)
        # Phase 2: Incremental indexing of just the changed file
        if change_type in ("modified", "created"):
            await self._indexer.index_project(self._project_path, self._project_id)

    async def shutdown(self) -> None:
        """Stop watching and clean up."""
        await self._watcher.stop()
        logger.info("context_engine_shutdown")
