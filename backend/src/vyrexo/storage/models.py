"""
SQLAlchemy ORM Models — Supabase PostgreSQL schema.

These models define the database tables. Supabase-compatible:
just point DATABASE_URL to your Supabase connection string.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_path: Mapped[str] = mapped_column(Text, nullable=False)
    project_name: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | paused | ended
    mode: Mapped[str] = mapped_column(String(30), default="normal")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    turns: Mapped[list["ConversationTurn"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    actions: Mapped[list["AgentAction"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class ConversationTurn(Base):
    __tablename__ = "conversation_turns"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), ForeignKey("sessions.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user | assistant | system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[str | None] = mapped_column(String(30))  # command | question | conversation | mode_switch
    emotion: Mapped[str | None] = mapped_column(String(20))  # neutral | frustrated | confused | urgent
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    metadata_json: Mapped[dict | None] = mapped_column(JSON, default=None)

    # Relationships
    session: Mapped["Session"] = relationship(back_populates="turns")


class AgentAction(Base):
    __tablename__ = "agent_actions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), ForeignKey("sessions.id"), nullable=False)
    agent_name: Mapped[str] = mapped_column(String(30), nullable=False)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    input_summary: Mapped[str | None] = mapped_column(Text)
    output_summary: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="running")  # running | completed | failed
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_json: Mapped[dict | None] = mapped_column(JSON, default=None)

    # Relationships
    session: Mapped["Session"] = relationship(back_populates="actions")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    path: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    config_json: Mapped[dict | None] = mapped_column(JSON, default=None)


# ── Phase 2 Tables (defined now, used later) ────────────────────

class DeveloperProfile(Base):
    __tablename__ = "developer_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    preferences: Mapped[dict | None] = mapped_column(JSON)  # verbosity, speed, style
    coding_style: Mapped[dict | None] = mapped_column(JSON)  # indentation, naming
    vocabulary: Mapped[dict | None] = mapped_column(JSON)  # project-specific terms
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class ProjectMemory(Base):
    __tablename__ = "project_memory"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("projects.id"), nullable=False)
    key: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
