"""
EventBus — The architectural backbone of Vyrexo.

Async pub/sub with glob pattern matching. Every component communicates
through events, making Phase 2 features plug in without modifying existing code.
"""

from __future__ import annotations

import asyncio
import fnmatch
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

import structlog

logger = structlog.get_logger()

EventHandler = Callable[["Event"], Awaitable[None]]


@dataclass(frozen=True, slots=True)
class Event:
    type: str
    payload: dict[str, Any]
    id: str = field(default_factory=lambda: uuid.uuid4().hex)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    session_id: str | None = None


class EventBus:
    """
    In-process async event bus with pattern-based subscriptions.

    - Exact subscriptions: subscribe("agent.plan.created", handler)
    - Pattern subscriptions: subscribe_pattern("agent.*", handler)
      Uses fnmatch glob patterns — "agent.*" matches "agent.plan.created", etc.

    Phase 2 features subscribe to existing event patterns or publish new types.
    No registration needed for new event types.
    """

    def __init__(self) -> None:
        self._exact_handlers: dict[str, list[EventHandler]] = {}
        self._pattern_handlers: list[tuple[str, EventHandler]] = []
        self._history: list[Event] = []
        self._max_history = 1000

    async def publish(self, event: Event) -> None:
        """Publish an event to all matching subscribers."""
        self._history.append(event)
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]

        handlers: list[EventHandler] = []

        # Exact match handlers
        if event.type in self._exact_handlers:
            handlers.extend(self._exact_handlers[event.type])

        # Pattern match handlers
        for pattern, handler in self._pattern_handlers:
            if fnmatch.fnmatch(event.type, pattern):
                handlers.append(handler)

        if not handlers:
            return

        # Fire all handlers concurrently
        results = await asyncio.gather(
            *(self._safe_call(handler, event) for handler in handlers),
            return_exceptions=True,
        )

        for result in results:
            if isinstance(result, Exception):
                logger.error("event_handler_error", event_type=event.type, error=str(result))

    async def _safe_call(self, handler: EventHandler, event: Event) -> None:
        try:
            await handler(event)
        except Exception:
            logger.exception("event_handler_exception", event_type=event.type)
            raise

    def subscribe(self, event_type: str, handler: EventHandler) -> Callable[[], None]:
        """Subscribe to an exact event type. Returns an unsubscribe function."""
        self._exact_handlers.setdefault(event_type, []).append(handler)

        def unsubscribe() -> None:
            handlers = self._exact_handlers.get(event_type, [])
            if handler in handlers:
                handlers.remove(handler)

        return unsubscribe

    def subscribe_pattern(self, pattern: str, handler: EventHandler) -> Callable[[], None]:
        """
        Subscribe to events matching a glob pattern.

        Examples:
            "agent.*"       -> matches agent.plan.created, agent.action.file_write, etc.
            "voice.*"       -> matches voice.transcription.partial, voice.output.started, etc.
            "*.completed"   -> matches agent.plan.step.completed, execution.command.completed, etc.
        """
        entry = (pattern, handler)
        self._pattern_handlers.append(entry)

        def unsubscribe() -> None:
            if entry in self._pattern_handlers:
                self._pattern_handlers.remove(entry)

        return unsubscribe

    def get_recent_events(
        self, event_type: str | None = None, limit: int = 50
    ) -> list[Event]:
        """Get recent events, optionally filtered by type."""
        events = self._history
        if event_type:
            events = [e for e in events if fnmatch.fnmatch(e.type, event_type)]
        return events[-limit:]

    def clear(self) -> None:
        """Remove all subscriptions and history."""
        self._exact_handlers.clear()
        self._pattern_handlers.clear()
        self._history.clear()
