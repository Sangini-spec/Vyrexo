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

# Per-session voice config (accent, rate). Updated via voice.config client messages.
_session_voice_configs: dict[str, VoiceConfig] = {}

# Per-session connected project directory. All agent work for a session runs
# inside this path. Set via project.set client messages; defaults to "." (the
# server's CWD) until a project is connected.
_session_projects: dict[str, str] = {}

# Per-session TTS work queues. Producers (narration / turn-completed handlers)
# push text onto the queue. A single worker per session drains it sequentially,
# which means narrations are spoken in order without overlap — but synthesis
# of the NEXT item begins as soon as the previous one finishes, so the
# Edge-TTS handshake of item N+1 overlaps with the playback of item N on the
# client. That eliminates the back-to-back stalls we had before.
_tts_queues: dict[str, asyncio.Queue[str]] = {}
_tts_workers: dict[str, asyncio.Task] = {}
# Last spoken line per session so we can drop duplicates that arrive in quick succession
_tts_recent: dict[str, tuple[str, float]] = {}


def _drain_tts_queue(session_id: str) -> None:
    """Empty any pending TTS items for a session (called on interrupt)."""
    q = _tts_queues.get(session_id)
    if q is None:
        return
    while not q.empty():
        try:
            q.get_nowait()
            q.task_done()
        except Exception:
            break


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

        # Pre-warm both engines in the background so the FIRST user-facing
        # call doesn't pay the cold-start handshake (Edge-TTS opens a WebSocket
        # to Microsoft, Whisper loads a multi-MB model into memory).
        asyncio.create_task(_prewarm_voice_engines())
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
    event_bus.subscribe("project.set.requested", _handle_project_set)

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

    # Run all work inside the session's connected project (set via project.set).
    # Falls back to the server CWD if no project has been connected yet.
    project_path = _session_projects.get(session_id) or "."

    # Process through the full pipeline:
    # intent classification → context retrieval → agent orchestration → response
    response = await conversation_manager.process_turn(
        transcript=TranscriptionResult(text=text),
        session_id=session_id,
        project_path=project_path,
    )

    # Publish response for TTS narration + WebSocket forwarding
    await event_bus.publish(Event(
        type="conversation.turn.completed",
        payload={"text": response},
        session_id=session_id,
    ))


async def _handle_interrupt(event: Event) -> None:
    """Handle interrupt requests — pause the orchestrator and kill TTS immediately."""
    session_id = event.session_id or ""

    # 1. Stop the agent pipeline
    if orchestrator is not None:
        await orchestrator.interrupt()

    # 2. Stop Edge-TTS mid-stream and drain any queued lines so Rex goes silent immediately
    if voice_pipeline is not None:
        await voice_pipeline.interrupt()
    _drain_tts_queue(session_id)

    # 3. Acknowledge so the frontend can reset its state
    await event_bus.publish(Event(
        type="execution.interrupt.acknowledged",
        payload={"message": "Interrupted. What would you like instead?"},
        session_id=session_id,
    ))


def _voice_config_for(session_id: str) -> VoiceConfig:
    """Return the voice config for this session, falling back to defaults."""
    cfg = _session_voice_configs.get(session_id)
    if cfg is not None:
        return cfg
    settings = get_settings()
    return VoiceConfig(voice=settings.tts.voice)


async def _prewarm_voice_engines() -> None:
    """Cold-start both STT and TTS so the user's first request feels snappy.

    Edge-TTS: synthesize a single short word so DNS, TLS, and the WebSocket
    handshake to Microsoft's edge servers happen before the user speaks.
    Whisper: trigger model load so the first STT call doesn't pay the
    multi-second model-load cost.
    """
    if voice_pipeline is None:
        return
    try:
        # Warm Edge-TTS by synthesizing one silent-ish token. Discard the bytes.
        async for _ in voice_pipeline._tts.synthesize("Ready.", _voice_config_for("")):
            pass
        logger.info("tts_prewarmed")
    except Exception:
        logger.debug("tts_prewarm_failed")

    try:
        # Force the Whisper model into memory by calling the lazy loader.
        # We don't transcribe anything; just touch the model.
        loader = getattr(voice_pipeline._stt, "_load_model", None)
        if callable(loader):
            await asyncio.to_thread(loader)
            logger.info("stt_prewarmed")
    except Exception:
        logger.debug("stt_prewarm_failed")


async def _tts_worker(session_id: str) -> None:
    """Drain a session's TTS queue one item at a time, in order."""
    queue = _tts_queues[session_id]
    while True:
        text = await queue.get()
        try:
            if voice_pipeline is None or not text:
                continue
            voice_pipeline.set_voice_config(_voice_config_for(session_id))
            ctx = VoiceContext(session_id=session_id)
            async for _chunk in voice_pipeline.synthesize_response(text, ctx):
                pass
        except Exception:
            logger.exception("tts_worker_failed", session_id=session_id)
        finally:
            queue.task_done()


def _ensure_tts_worker(session_id: str) -> asyncio.Queue[str]:
    """Get-or-create the per-session TTS queue and worker."""
    queue = _tts_queues.get(session_id)
    if queue is None:
        queue = asyncio.Queue()
        _tts_queues[session_id] = queue
        _tts_workers[session_id] = asyncio.create_task(_tts_worker(session_id))
    return queue


async def _speak(session_id: str, text: str) -> None:
    """Queue text for TTS playback. Synthesis happens in the per-session worker.

    Same line within 2 seconds is dropped as a duplicate so we don't speak
    the same narration twice (which happens when agents narrate the same
    tool repeatedly).
    """
    if not text or voice_pipeline is None or not session_id:
        return

    import time
    clean = text.strip()
    if not clean:
        return

    # Drop a duplicate that arrived within 2 seconds
    prev = _tts_recent.get(session_id)
    now = time.monotonic()
    if prev and prev[0] == clean and (now - prev[1]) < 2.0:
        return
    _tts_recent[session_id] = (clean, now)

    queue = _ensure_tts_worker(session_id)
    await queue.put(clean)


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


async def _handle_project_set(event: Event) -> None:
    """Bind a project directory to a session and index it for context.

    After this, every turn for ``session_id`` runs inside ``path`` (file ops,
    shell commands, and RAG all scope to the connected project). Publishes a
    ``project.loaded`` event the frontend uses to show the project name (or an
    error if the path is invalid).
    """
    session_id = event.session_id or ""
    raw_path = ((event.payload or {}).get("path") or "").strip()

    if not raw_path:
        return

    p = Path(raw_path).expanduser()
    if not p.exists() or not p.is_dir():
        logger.warning("project_set_invalid", session_id=session_id, path=raw_path)
        await event_bus.publish(Event(
            type="project.loaded",
            payload={"ok": False, "error": "That folder could not be found.", "path": raw_path},
            session_id=session_id,
        ))
        return

    resolved = str(p.resolve())
    _session_projects[session_id] = resolved
    logger.info("project_set", session_id=session_id, path=resolved)

    # Let the user know we're indexing (can take a moment on large projects)
    await event_bus.publish(Event(
        type="agent.narration",
        payload={"text": f"Connecting to {p.name}. Indexing it now so I know your codebase.", "agent": "rex"},
        session_id=session_id,
    ))

    files_indexed = 0
    if context_engine is not None:
        try:
            stats = await context_engine.load_project(resolved)
            files_indexed = int(stats.get("files_indexed", 0) or 0)
        except Exception:
            logger.exception("project_index_failed", path=resolved)

    await event_bus.publish(Event(
        type="project.loaded",
        payload={
            "ok": True,
            "path": resolved,
            "name": p.name,
            "files_indexed": files_indexed,
        },
        session_id=session_id,
    ))
    logger.info("project_loaded", session_id=session_id, name=p.name, files=files_indexed)


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
