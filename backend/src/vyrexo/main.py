"""
Vyrexo — FastAPI application entry point.

Initializes all core systems: EventBus, VoicePipeline, ContextEngine,
ConversationManager, AgentOrchestrator, Mode StateMachine.
"""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import structlog
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from vyrexo.api.routes import health_router, sessions_router, projects_router
from vyrexo.api.websocket.handler import SessionWebSocketHandler
from vyrexo.api.websocket.manager import ConnectionManager
from vyrexo.agents.orchestrator import AgentOrchestrator
from vyrexo.agents.registry import AgentRegistry
from vyrexo.config import get_settings
from vyrexo.context.engine import ContextEngine
from vyrexo.conversation.manager import ConversationManager
from vyrexo.conversation.memory.in_memory import InMemoryStore
from vyrexo.events.bus import Event, EventBus
from vyrexo.modes.implementations import (
    DebugMode,
    NormalMode,
    RubberDuckMode,
    ShipItMode,
    WhiteboardMode,
)
from vyrexo.modes.machine import InteractionStateMachine, ModeState
from vyrexo.storage.database import close_database, init_database
from vyrexo.voice.stt.base import TranscriptionResult

logger = structlog.get_logger()

# ── Globals ──────────────────────────────────────────────────────
event_bus = EventBus()
connection_manager = ConnectionManager()
mode_machine: InteractionStateMachine | None = None
orchestrator: AgentOrchestrator | None = None
context_engine: ContextEngine | None = None
conversation_manager: ConversationManager | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global mode_machine, orchestrator, context_engine, conversation_manager

    settings = get_settings()
    logger.info("vyrexo_starting", host=settings.server.host, port=settings.server.port)

    # Discover and register all agents
    agents_dir = Path(__file__).parent / "agents" / "implementations"
    AgentRegistry.discover_plugins(agents_dir)
    logger.info("agents_registered", agents=AgentRegistry.names())

    # Initialize orchestrator
    orchestrator = AgentOrchestrator(event_bus=event_bus)

    # Initialize context engine (codebase indexing + RAG)
    context_engine = ContextEngine(
        event_bus=event_bus,
        persist_dir=settings.chroma.persist_dir,
    )

    # Initialize interaction mode state machine
    modes = {
        ModeState.NORMAL: NormalMode(),
        ModeState.DEBUG: DebugMode(),
        ModeState.RUBBER_DUCK: RubberDuckMode(),
        ModeState.SHIP_IT: ShipItMode(),
        ModeState.WHITEBOARD: WhiteboardMode(),
    }
    mode_machine = InteractionStateMachine(event_bus=event_bus, modes=modes)

    # Initialize conversation manager (ties everything together)
    memory_store = InMemoryStore()
    conversation_manager = ConversationManager(
        event_bus=event_bus,
        orchestrator=orchestrator,
        context_engine=context_engine,
        memory_store=memory_store,
        mode_machine=mode_machine,
    )

    # Wire up event handlers
    event_bus.subscribe("conversation.turn.started", _handle_conversation_turn)
    event_bus.subscribe("execution.interrupt.requested", _handle_interrupt)

    # Initialize database (creates tables if they don't exist)
    try:
        await init_database()
        logger.info("database_ready")
    except Exception as e:
        logger.warning("database_skip", reason=str(e)[:100])
        # Don't fail startup if DB is unavailable — in-memory mode still works

    logger.info("vyrexo_ready", modes=[m.value for m in modes.keys()])

    yield

    # Shutdown
    if context_engine:
        await context_engine.shutdown()
    await close_database()
    event_bus.clear()
    logger.info("vyrexo_shutdown")


async def _handle_conversation_turn(event: Event) -> None:
    """Handle incoming text/voice input — route through ConversationManager."""
    if conversation_manager is None:
        return

    text = event.payload.get("text", "")
    session_id = event.session_id or ""

    if not text.strip():
        return

    # Process through the full pipeline:
    # intent classification → context retrieval → agent orchestration → response
    response = await conversation_manager.process_turn(
        transcript=TranscriptionResult(text=text),
        session_id=session_id,
        project_path=".",  # TODO: get from session config
    )

    # Publish response for TTS narration + WebSocket forwarding
    await event_bus.publish(Event(
        type="conversation.turn.completed",
        payload={"text": response},
        session_id=session_id,
    ))


async def _handle_interrupt(event: Event) -> None:
    """Handle interrupt requests — pause the orchestrator."""
    if orchestrator is not None:
        await orchestrator.interrupt()


# ── App Creation ─────────────────────────────────────────────────

app = FastAPI(
    title="Vyrexo",
    description="Voice-first conversational AI coding assistant",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST Routes ──────────────────────────────────────────────────

app.include_router(health_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(projects_router, prefix="/api")


# ── WebSocket Endpoint ───────────────────────────────────────────

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str) -> None:
    handler = SessionWebSocketHandler(
        event_bus=event_bus,
        connection_manager=connection_manager,
    )
    await handler.handle(websocket, session_id)
