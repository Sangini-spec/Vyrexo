"""
FileWatcher — Watches project directory for changes and triggers re-indexing.

Uses watchdog to monitor file system events. Publishes events to the
EventBus so the ContextEngine can update the index incrementally.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Callable, Awaitable

import structlog

logger = structlog.get_logger()

# Debounce: wait this many seconds after last change before re-indexing
DEBOUNCE_SECONDS = 2.0


class FileWatcher:
    """
    Watches a project directory for file changes.

    On change, calls the provided callback (e.g., re-index the changed file).
    Debounces rapid changes to avoid excessive re-indexing.
    """

    def __init__(self, on_change: Callable[[str, str], Awaitable[None]] | None = None) -> None:
        self._on_change = on_change
        self._observer = None
        self._debounce_task: asyncio.Task | None = None
        self._pending_changes: list[tuple[str, str]] = []

    async def start(self, project_path: str) -> None:
        """Start watching a project directory."""
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler, FileSystemEvent

        path = Path(project_path).resolve()
        if not path.exists():
            logger.error("watcher_path_not_found", path=str(path))
            return

        watcher = self

        class Handler(FileSystemEventHandler):
            def on_modified(self, event: FileSystemEvent) -> None:
                if not event.is_directory:
                    watcher._queue_change("modified", event.src_path)

            def on_created(self, event: FileSystemEvent) -> None:
                if not event.is_directory:
                    watcher._queue_change("created", event.src_path)

            def on_deleted(self, event: FileSystemEvent) -> None:
                if not event.is_directory:
                    watcher._queue_change("deleted", event.src_path)

        self._observer = Observer()
        self._observer.schedule(Handler(), str(path), recursive=True)
        self._observer.start()

        logger.info("watcher_started", path=str(path))

    def _queue_change(self, change_type: str, file_path: str) -> None:
        """Queue a change and debounce."""
        # Skip noise
        skip_patterns = ("__pycache__", "node_modules", ".git", ".pyc", ".swp", "~")
        if any(p in file_path for p in skip_patterns):
            return

        self._pending_changes.append((change_type, file_path))

        # Cancel previous debounce
        if self._debounce_task and not self._debounce_task.done():
            self._debounce_task.cancel()

        # Schedule debounced callback
        try:
            loop = asyncio.get_running_loop()
            self._debounce_task = loop.create_task(self._debounced_process())
        except RuntimeError:
            pass

    async def _debounced_process(self) -> None:
        """Wait for debounce period, then process all pending changes."""
        await asyncio.sleep(DEBOUNCE_SECONDS)

        changes = self._pending_changes.copy()
        self._pending_changes.clear()

        if self._on_change and changes:
            for change_type, file_path in changes:
                try:
                    await self._on_change(change_type, file_path)
                except Exception:
                    logger.exception("watcher_callback_error", file=file_path)

    async def stop(self) -> None:
        """Stop watching."""
        if self._observer:
            self._observer.stop()
            self._observer.join(timeout=5)
            self._observer = None
            logger.info("watcher_stopped")
