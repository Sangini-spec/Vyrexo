"""
InteractionStateMachine — Controls which mode the system is in.

Modes: normal, debug, rubber_duck, ship_it, whiteboard.
All non-normal modes can only return to normal. Normal can go to any mode.
"""

from __future__ import annotations

from enum import Enum

import structlog

from vyrexo.events.bus import Event, EventBus
from vyrexo.modes.base import InteractionMode

logger = structlog.get_logger()


class ModeState(str, Enum):
    NORMAL = "normal"
    DEBUG = "debug"
    RUBBER_DUCK = "rubber_duck"
    SHIP_IT = "ship_it"
    WHITEBOARD = "whiteboard"


# Valid transitions
TRANSITIONS: dict[ModeState, set[ModeState]] = {
    ModeState.NORMAL: {ModeState.DEBUG, ModeState.RUBBER_DUCK, ModeState.SHIP_IT, ModeState.WHITEBOARD},
    ModeState.DEBUG: {ModeState.NORMAL},
    ModeState.RUBBER_DUCK: {ModeState.NORMAL},
    ModeState.SHIP_IT: {ModeState.NORMAL},
    ModeState.WHITEBOARD: {ModeState.NORMAL},
}


class InteractionStateMachine:
    def __init__(
        self,
        event_bus: EventBus,
        modes: dict[ModeState, InteractionMode],
    ) -> None:
        self._state = ModeState.NORMAL
        self._modes = modes
        self._event_bus = event_bus

    @property
    def current(self) -> InteractionMode:
        return self._modes[self._state]

    @property
    def state(self) -> ModeState:
        return self._state

    async def transition(self, target: ModeState) -> bool:
        """
        Attempt to transition to a new mode.

        Returns True if transition succeeded, False if not allowed.
        """
        if target == self._state:
            return True

        if target not in TRANSITIONS.get(self._state, set()):
            logger.warning(
                "invalid_mode_transition",
                current=self._state.value,
                target=target.value,
            )
            return False

        old = self._state

        await self._modes[old].on_exit()
        self._state = target
        await self._modes[target].on_enter()

        await self._event_bus.publish(Event(
            type="mode.transition",
            payload={"from": old.value, "to": target.value},
        ))

        logger.info("mode_transition", old=old.value, new=target.value)
        return True
