"""
VoicePipeline — Orchestrates the full STT → Middleware → TTS flow.

This is the central coordinator for all voice processing:
1. Receives audio chunks from WebSocket
2. Runs STT (Whisper) to get transcription
3. Passes through middleware chain (noise gate, emotion, interrupt)
4. Sends processed transcript to ConversationManager
5. Receives response text
6. Passes through output middleware chain
7. Runs TTS (edge-tts) to generate audio
8. Streams audio back via WebSocket
"""

from __future__ import annotations

from typing import AsyncIterator

import structlog

from vyrexo.events.bus import Event, EventBus
from vyrexo.voice.middleware.base import VoiceContext, VoiceMiddleware
from vyrexo.voice.stt.base import AudioChunk, STTProvider, TranscriptionResult
from vyrexo.voice.tts.base import TTSAudioChunk, TTSProvider, VoiceConfig

logger = structlog.get_logger()


class VoicePipeline:
    """
    Orchestrates the full voice processing pipeline.

    The middleware chain is composable — Phase 2 adds ToneAdapter
    by appending to the chain, zero changes to this class.
    """

    def __init__(
        self,
        stt: STTProvider,
        tts: TTSProvider,
        event_bus: EventBus,
        middleware: list[VoiceMiddleware] | None = None,
    ) -> None:
        self._stt = stt
        self._tts = tts
        self._event_bus = event_bus
        self._middleware = middleware or []
        self._voice_config = VoiceConfig()

    def set_voice_config(self, config: VoiceConfig) -> None:
        """Update the voice configuration (accent, speed, etc.)."""
        self._voice_config = config

    def add_middleware(self, middleware: VoiceMiddleware) -> None:
        """Add a middleware to the end of the chain."""
        self._middleware.append(middleware)

    # ── Input Processing (Speech → Text) ─────────────────────────

    async def process_audio(
        self, audio: AudioChunk, context: VoiceContext
    ) -> TranscriptionResult | None:
        """
        Process a complete audio buffer through STT + middleware.

        Returns the processed transcript, or None if filtered out.
        """
        # Step 1: Speech-to-Text
        transcript = await self._stt.transcribe(audio)

        await self._event_bus.publish(Event(
            type="voice.transcription.final",
            payload={
                "text": transcript.text,
                "confidence": transcript.confidence,
                "language": transcript.language,
            },
            session_id=context.session_id,
        ))

        # Step 2: Run through input middleware chain
        result = transcript
        for mw in self._middleware:
            result = await mw.process_input(result, context)
            if result is None:
                logger.debug("middleware_filtered_input", middleware=mw.__class__.__name__)
                return None

        return result

    async def process_audio_stream(
        self, audio_stream: AsyncIterator[AudioChunk], context: VoiceContext
    ) -> AsyncIterator[TranscriptionResult]:
        """
        Process a streaming audio input through STT + middleware.

        Yields partial and final transcription results.
        """
        async for transcript in self._stt.transcribe_stream(audio_stream):
            # Publish partial transcriptions for live UI updates
            if not transcript.is_final:
                await self._event_bus.publish(Event(
                    type="voice.transcription.partial",
                    payload={"text": transcript.text, "confidence": transcript.confidence},
                    session_id=context.session_id,
                ))
                yield transcript
                continue

            # Run final transcriptions through middleware
            result = transcript
            for mw in self._middleware:
                result = await mw.process_input(result, context)
                if result is None:
                    break

            if result is not None:
                await self._event_bus.publish(Event(
                    type="voice.transcription.final",
                    payload={
                        "text": result.text,
                        "confidence": result.confidence,
                        "language": result.language,
                        "emotion": result.metadata.get("emotion", "neutral"),
                    },
                    session_id=context.session_id,
                ))
                yield result

    # ── Output Processing (Text → Speech) ────────────────────────

    async def synthesize_response(
        self, text: str, context: VoiceContext
    ) -> AsyncIterator[TTSAudioChunk]:
        """
        Process response text through output middleware, then TTS.

        Yields streaming audio chunks for playback.
        """
        # Step 1: Run through output middleware chain
        processed_text = text
        for mw in self._middleware:
            processed_text = await mw.process_output(processed_text, context)
            if processed_text is None:
                logger.debug("middleware_filtered_output", middleware=mw.__class__.__name__)
                return

        # Step 2: Publish that we're starting speech output
        await self._event_bus.publish(Event(
            type="voice.output.started",
            payload={"text": processed_text[:100]},
            session_id=context.session_id,
        ))

        # Step 3: Text-to-Speech
        async for chunk in self._tts.synthesize(processed_text, self._voice_config):
            # Publish the raw audio data so subscribers (e.g., WebSocket handler)
            # can forward it as a binary frame to the client. The WebSocket handler
            # strips bytes for JSON events; for this event the raw bytes ARE the payload.
            await self._event_bus.publish(Event(
                type="voice.output.chunk",
                payload={
                    "audio": chunk.data,
                    "format": chunk.format,
                    "sample_rate": chunk.sample_rate,
                },
                session_id=context.session_id,
            ))
            yield chunk

        # Step 4: Signal completion
        await self._event_bus.publish(Event(
            type="voice.output.completed",
            payload={},
            session_id=context.session_id,
        ))

    async def interrupt(self) -> None:
        """Interrupt any ongoing TTS output."""
        await self._tts.interrupt()

    async def shutdown(self) -> None:
        """Clean up all resources."""
        await self._stt.shutdown()
        await self._tts.shutdown()
        logger.info("voice_pipeline_shutdown")
