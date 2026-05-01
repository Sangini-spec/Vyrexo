"""Shared test fixtures."""

import pytest

from vyrexo.events.bus import EventBus


@pytest.fixture
def event_bus() -> EventBus:
    bus = EventBus()
    yield bus
    bus.clear()
