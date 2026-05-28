"""BaseAgent — Abstract base for all AI agents in the system."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from vyrexo.events.bus import Event, EventBus


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

    async def narrate(self, state: dict[str, Any], text: str) -> None:
        """
        Publish a narration event so the user hears what the agent is doing
        in near real-time (e.g. "Reading auth.py...", "Installing FastAPI...").

        The event_bus and session_id are pulled from the shared state dict,
        which the orchestrator injects at the start of each run.
        """
        if not text:
            return
        event_bus: EventBus | None = state.get("event_bus")
        session_id: str = state.get("session_id", "") or ""
        if event_bus is None:
            return
        await event_bus.publish(Event(
            type="agent.narration",
            payload={
                "text": text,
                "agent": self.name,
            },
            session_id=session_id,
        ))

    # Tool calls we silently skip because they finish in milliseconds and
    # narrating each one only adds TTS latency for the user.
    _SILENT_TOOLS: set[str] = {
        "read_file",
        "list_directory",
        "git_status",
        "git_diff",
        "git_log",
        "search_codebase",
    }

    async def narrate_tool_call(self, state: dict[str, Any], tool_name: str, args: dict[str, Any]) -> None:
        """
        Build a SHORT narration for the tool the agent is about to run.
        Skips fast/quiet tools (file reads, git inspections) so we only
        speak about actions that actually take time or change state.
        """
        if tool_name in self._SILENT_TOOLS:
            return

        path = args.get("path") or args.get("file_path") or ""
        command = args.get("command") or ""
        message = args.get("message") or ""

        if tool_name == "write_file" and path:
            line = f"Writing {path}."
        elif tool_name == "create_file" and path:
            line = f"Creating {path}."
        elif tool_name == "delete_file" and path:
            line = f"Removing {path}."
        elif tool_name == "run_command" and command:
            short = command if len(command) <= 50 else command[:50].rsplit(" ", 1)[0] + "..."
            line = f"Running: {short}"
        elif tool_name == "git_add":
            line = "Staging changes."
        elif tool_name == "git_commit" and message:
            short_msg = message if len(message) <= 50 else message[:50] + "..."
            line = f"Committing: {short_msg}"
        elif tool_name == "git_commit":
            line = "Committing."
        elif tool_name == "git_push":
            line = "Pushing to remote."
        elif tool_name == "git_branch":
            name = args.get("name") or ""
            line = f"Creating branch {name}." if name else "Branching."
        else:
            line = f"Running {tool_name}."

        await self.narrate(state, line)
