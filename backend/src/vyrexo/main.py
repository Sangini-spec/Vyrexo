"""
Vyrexo — FastAPI application entry point.

Initializes all core systems: EventBus, VoicePipeline, ContextEngine,
ConversationManager, AgentOrchestrator, Mode StateMachine.
"""

import asyncio
import io
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

# Force UTF-8 stdout/stderr on Windows so emoji and special chars in narration
# don't crash the structlog console formatter with charmap encoding errors.
if sys.platform == "win32":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True)
    except Exception:
        pass

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
from vyrexo.voice.middleware.base import VoiceContext
from vyrexo.voice.pipeline import VoicePipeline
from vyrexo.voice.stt.base import TranscriptionResult
from vyrexo.voice.stt.whisper_local import WhisperLocalSTT
from vyrexo.voice.tts.base import VoiceConfig
from vyrexo.voice.tts.edge_tts_provider import VOICE_PRESETS, EdgeTTSProvider

logger = structlog.get_logger()

# ── Globals ──────────────────────────────────────────────────────
event_bus = EventBus()
connection_manager = ConnectionManager()
mode_machine: InteractionStateMachine | None = None
orchestrator: AgentOrchestrator | None = None
context_engine: ContextEngine | None = None
conversation_manager: ConversationManager | None = None
voice_pipeline: VoicePipeline | None = None

# One lock per session so narrations are spoken one at a time (no overlapping audio).
_tts_locks: dict[str, asyncio.Lock] = {}
# Per-session voice config (accent, rate). Updated via voice.config client messages.
_session_voice_configs: dict[str, VoiceConfig] = {}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global mode_machine, orchestrator, context_engine, conversation_manager, voice_pipeline

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

    # Initialize voice pipeline so Rex can actually speak with Edge-TTS
    try:
        voice_pipeline = VoicePipeline(
            stt=WhisperLocalSTT(model_size=settings.stt.whisper_model_size),
            tts=EdgeTTSProvider(default_voice=settings.tts.voice),
            event_bus=event_bus,
        )
        logger.info("voice_pipeline_ready", tts_voice=settings.tts.voice)
    except Exception as e:
        logger.warning("voice_pipeline_skip", reason=str(e)[:100])
        voice_pipeline = None

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
    # Speak narrations and turn responses through Edge-TTS
    event_bus.subscribe("agent.narration", _handle_narration)
    event_bus.subscribe("conversation.turn.completed", _handle_turn_completed)
    event_bus.subscribe("voice.config.requested", _handle_voice_config)

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


def _voice_config_for(session_id: str) -> VoiceConfig:
    """Return the voice config for this session, falling back to defaults."""
    cfg = _session_voice_configs.get(session_id)
    if cfg is not None:
        return cfg
    settings = get_settings()
    return VoiceConfig(voice=settings.tts.voice)


def _lock_for(session_id: str) -> asyncio.Lock:
    """Get-or-create an asyncio lock per session so TTS plays one line at a time."""
    lock = _tts_locks.get(session_id)
    if lock is None:
        lock = asyncio.Lock()
        _tts_locks[session_id] = lock
    return lock


async def _speak(session_id: str, text: str) -> None:
    """Synthesize text through Edge-TTS and let the pipeline publish audio chunks.

    The WebSocket handler will forward voice.output.chunk events as binary frames
    so the browser plays them with the user's chosen voice.
    """
    if not text or voice_pipeline is None or not session_id:
        return
    voice_pipeline.set_voice_config(_voice_config_for(session_id))
    ctx = VoiceContext(session_id=session_id)
    lock = _lock_for(session_id)
    async with lock:
        try:
            # Iterate the generator so the pipeline publishes chunks as events.
            async for _chunk in voice_pipeline.synthesize_response(text, ctx):
                pass
        except Exception:
            logger.exception("tts_speak_failed", session_id=session_id)


async def _handle_narration(event: Event) -> None:
    """Speak agent narration aloud through Edge-TTS."""
    text = event.payload.get("text", "")
    session_id = event.session_id or ""
    await _speak(session_id, text)


async def _handle_turn_completed(event: Event) -> None:
    """Speak the final response of a conversation turn."""
    text = event.payload.get("text", "")
    session_id = event.session_id or ""
    await _speak(session_id, text)


async def _handle_voice_config(event: Event) -> None:
    """Update the per-session voice config when the frontend sends one."""
    session_id = event.session_id or ""
    payload = event.payload or {}
    voice_id = payload.get("voice")  # e.g. "american_male" or a raw edge-tts id like "en-US-GuyNeural"
    rate = payload.get("rate", "+0%")

    # Map the preset key to an actual edge-tts voice if needed
    if voice_id and voice_id in VOICE_PRESETS:
        edge_voice = VOICE_PRESETS[voice_id]
    elif voice_id:
        edge_voice = voice_id
    else:
        edge_voice = get_settings().tts.voice

    _session_voice_configs[session_id] = VoiceConfig(voice=edge_voice, rate=rate)
    logger.info("voice_config_updated", session_id=session_id, voice=edge_voice, rate=rate)


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
