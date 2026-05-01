"""Tests for the EventBus — the architectural backbone."""

import asyncio

import pytest

from vyrexo.events.bus import Event, EventBus


@pytest.fixture
def bus() -> EventBus:
    b = EventBus()
    yield b
    b.clear()


@pytest.mark.asyncio
async def test_exact_subscribe_and_publish(bus: EventBus) -> None:
    received: list[Event] = []

    async def handler(event: Event) -> None:
        received.append(event)

    bus.subscribe("test.event", handler)
    await bus.publish(Event(type="test.event", payload={"value": 42}))

    assert len(received) == 1
    assert received[0].payload["value"] == 42


@pytest.mark.asyncio
async def test_pattern_subscribe(bus: EventBus) -> None:
    received: list[Event] = []

    async def handler(event: Event) -> None:
        received.append(event)

    bus.subscribe_pattern("agent.*", handler)

    await bus.publish(Event(type="agent.plan.created", payload={}))
    await bus.publish(Event(type="agent.action.file_write", payload={}))
    await bus.publish(Event(type="voice.transcription.final", payload={}))

    assert len(received) == 2  # Only agent.* events


@pytest.mark.asyncio
async def test_unsubscribe(bus: EventBus) -> None:
    received: list[Event] = []

    async def handler(event: Event) -> None:
        received.append(event)

    unsub = bus.subscribe("test.event", handler)
    await bus.publish(Event(type="test.event", payload={}))
    assert len(received) == 1

    unsub()
    await bus.publish(Event(type="test.event", payload={}))
    assert len(received) == 1  # Still 1, handler was unsubscribed


@pytest.mark.asyncio
async def test_pattern_unsubscribe(bus: EventBus) -> None:
    received: list[Event] = []

    async def handler(event: Event) -> None:
        received.append(event)

    unsub = bus.subscribe_pattern("voice.*", handler)
    await bus.publish(Event(type="voice.output.started", payload={}))
    assert len(received) == 1

    unsub()
    await bus.publish(Event(type="voice.output.completed", payload={}))
    assert len(received) == 1


@pytest.mark.asyncio
async def test_multiple_handlers(bus: EventBus) -> None:
    results: list[str] = []

    async def handler_a(event: Event) -> None:
        results.append("a")

    async def handler_b(event: Event) -> None:
        results.append("b")

    bus.subscribe("test.event", handler_a)
    bus.subscribe("test.event", handler_b)

    await bus.publish(Event(type="test.event", payload={}))

    assert sorted(results) == ["a", "b"]


@pytest.mark.asyncio
async def test_session_filtering_via_payload(bus: EventBus) -> None:
    received: list[Event] = []

    async def handler(event: Event) -> None:
        received.append(event)

    bus.subscribe("test.event", handler)

    await bus.publish(Event(type="test.event", payload={}, session_id="session-1"))
    await bus.publish(Event(type="test.event", payload={}, session_id="session-2"))

    assert len(received) == 2
    assert received[0].session_id == "session-1"
    assert received[1].session_id == "session-2"


@pytest.mark.asyncio
async def test_handler_error_doesnt_break_others(bus: EventBus) -> None:
    results: list[str] = []

    async def bad_handler(event: Event) -> None:
        raise ValueError("boom")

    async def good_handler(event: Event) -> None:
        results.append("ok")

    bus.subscribe("test.event", bad_handler)
    bus.subscribe("test.event", good_handler)

    await bus.publish(Event(type="test.event", payload={}))

    assert "ok" in results


@pytest.mark.asyncio
async def test_event_history(bus: EventBus) -> None:
    for i in range(5):
        await bus.publish(Event(type=f"test.event.{i}", payload={"i": i}))

    history = bus.get_recent_events(limit=3)
    assert len(history) == 3
    assert history[0].payload["i"] == 2


@pytest.mark.asyncio
async def test_event_history_filtered(bus: EventBus) -> None:
    await bus.publish(Event(type="agent.plan.created", payload={}))
    await bus.publish(Event(type="voice.transcription.final", payload={}))
    await bus.publish(Event(type="agent.action.file_write", payload={}))

    agent_events = bus.get_recent_events("agent.*")
    assert len(agent_events) == 2


@pytest.mark.asyncio
async def test_no_subscribers_doesnt_error(bus: EventBus) -> None:
    # Should not raise
    await bus.publish(Event(type="nobody.listens", payload={}))
