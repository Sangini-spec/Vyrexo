"""BaseAgent — Abstract base for all AI agents in the system."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ToolDefinition:
    """Definition of a tool that an agent can use via the LLM."""

    name: str
    description: str
    parameters: dict[str, Any]


class BaseAgent(ABC):
    """
    Abstract base for all Vyrexo agents.

    Each agent is a node in the LangGraph DAG. Agents are registered
    via @AgentRegistry.register and dynamically wired into the graph.

    Phase 2: New agents (DebugAgent, ArchitectAgent) just implement
    this ABC and add the @register decorator — they're automatically
    added to the orchestration graph.
    """

    name: str = ""
    description: str = ""
    capabilities: list[str] = []

    # Which Gemini model this agent uses: "heavy" (Pro) or "light" (Flash)
    model_tier: str = "heavy"

    @abstractmethod
    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        """
        Execute this agent's work.

        Receives the shared AgentState dict, performs work (LLM calls,
        tool execution), and returns the updated state.
        """
        ...

    @abstractmethod
    def get_tools(self) -> list[ToolDefinition]:
        """Return the tool definitions this agent provides to the LLM."""
        ...

    def get_system_prompt(self) -> str:
        """Return the system prompt for this agent. Override per agent."""
        return f"You are the {self.name} agent. {self.description}"
