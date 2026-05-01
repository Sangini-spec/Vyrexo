"""
AgentState — Shared state schema for the LangGraph orchestration graph.

All agents read and write to this state. The state flows through the graph
and accumulates results from each agent node.
"""

from __future__ import annotations

from typing import Any, TypedDict


class TaskStep(TypedDict):
    index: int
    description: str
    agent_name: str
    status: str  # "pending" | "running" | "completed" | "failed"
    result: dict[str, Any] | None


class AgentConflict(TypedDict):
    """When agents disagree (Phase 2: narrated to developer for arbitration)."""

    agents: list[str]
    description: str
    severity: str  # "info" | "warning" | "critical"
    resolution: str | None


class AgentState(TypedDict, total=False):
    """
    Shared state flowing through the LangGraph DAG.

    Fields marked as Phase 2 are defined now but unused in MVP.
    They exist so the state schema doesn't need to change later.
    """

    # Core
    messages: list[dict[str, Any]]
    session_id: str
    project_path: str

    # Planning
    plan: list[TaskStep]
    current_step: int

    # Results
    artifacts: dict[str, Any]  # {"files_modified": [...], "commands_run": [...]}
    agent_decisions: list[dict[str, Any]]  # Audit trail of agent reasoning
    final_response: str

    # Execution control
    interrupted: bool
    mode: str

    # Phase 2: Agent conflict transparency
    conflicts: list[AgentConflict]
