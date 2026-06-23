"""
Database connection — Async SQLAlchemy engine for Supabase PostgreSQL.

Handles connection pooling, session management, and table creation.
"""

from __future__ import annotations

import asyncio
import sys
from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from vyrexo.config import get_settings
from vyrexo.storage.models import Base

# Fix Windows event loop for psycopg async
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logger = structlog.get_logger()

_engine = None
_session_factory = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            settings.database.url,
            echo=False,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )
    return _engine


def get_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


@asynccontextmanager
async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Get a database session. Use as async context manager."""
    factory = get_session_factory()
    session = factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


async def init_database() -> None:
    """Create all tables if they don't exist, and add any newly-introduced
    columns to existing tables (create_all only creates missing tables, it never
    alters existing ones — so we ADD COLUMN IF NOT EXISTS for evolving columns)."""
    from sqlalchemy import text

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Idempotent column additions for the sessions table (DB-backed sidebar).
    # Each runs in its OWN transaction so one failure can't abort the rest.
    for ddl in (
        "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id VARCHAR(64)",
        "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'New Session'",
        "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS icon VARCHAR(40)",
        "CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions (user_id)",
    ):
        try:
            async with engine.begin() as conn:
                await conn.execute(text(ddl))
        except Exception as e:  # non-fatal (column may already exist)
            logger.warning("session_migration_skip", ddl=ddl[:45], error=str(e)[:80])
    logger.info("database_initialized")


async def close_database() -> None:
    """Close the database engine."""
    global _engine, _session_factory
    if _engine:
        await _engine.dispose()
        _engine = None
        _session_factory = None
    logger.info("database_closed")
