"""
AgentRegistry — Plugin-based agent discovery and registration.

Agents self-register via the @AgentRegistry.register decorator.
The LangGraph graph is built dynamically from the registry at startup.

Phase 2: Drop a new agent file in implementations/, add @register — done.
"""

from __future__ import annotations

import importlib
from pathlib import Path
from typing import Type

import structlog

from vyrexo.agents.base import BaseAgent

logger = structlog.get_logger()


class AgentRegistry:
    _agents: dict[str, Type[BaseAgent]] = {}

    @classmethod
    def register(cls, agent_class: Type[BaseAgent]) -> Type[BaseAgent]:
        """
        Class decorator. Registers an agent by its .name attribute.

        Usage:
            @AgentRegistry.register
            class CodingAgent(BaseAgent):
                name = "coding"
                ...
        """
        if not agent_class.name:
            raise ValueError(f"Agent {agent_class.__name__} must define a 'name' attribute")

        cls._agents[agent_class.name] = agent_class
        logger.info("agent_registered", name=agent_class.name, cls=agent_class.__name__)
        return agent_class

    @classmethod
    def get(cls, name: str) -> Type[BaseAgent]:
        """Get an agent class by name."""
        if name not in cls._agents:
            raise KeyError(f"No agent registered with name '{name}'. Available: {list(cls._agents)}")
        return cls._agents[name]

    @classmethod
    def all(cls) -> dict[str, Type[BaseAgent]]:
        """Get all registered agents."""
        return dict(cls._agents)

    @classmethod
    def names(cls) -> list[str]:
        """Get all registered agent names."""
        return list(cls._agents.keys())

    @classmethod
    def create(cls, name: str, **kwargs: object) -> BaseAgent:
        """Instantiate a registered agent by name."""
        agent_cls = cls.get(name)
        return agent_cls(**kwargs)

    @classmethod
    def discover_plugins(cls, plugin_dir: Path) -> None:
        """
        Auto-discover agent plugins from a directory.

        Imports all .py modules in the directory, which triggers
        @register decorators on any agent classes defined within.
        """
        if not plugin_dir.exists():
            return

        for path in plugin_dir.glob("*.py"):
            if path.name.startswith("_"):
                continue
            module_name = path.stem
            try:
                importlib.import_module(f"vyrexo.agents.implementations.{module_name}")
                logger.info("agent_plugin_loaded", module=module_name)
            except Exception:
                logger.exception("agent_plugin_load_failed", module=module_name)

    @classmethod
    def clear(cls) -> None:
        """Clear all registrations. Mainly for testing."""
        cls._agents.clear()
