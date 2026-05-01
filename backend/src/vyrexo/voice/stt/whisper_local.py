"""Whisper Local STT — Runs OpenAI Whisper on the developer's machine."""

from __future__ import annotations

import io
import tempfile
from typing import AsyncIterator

import numpy as np
import structlog

from vyrexo.voice.stt.base import AudioChunk, STTProvider, TranscriptionResult

logger = structlog.get_logger()


class WhisperLocalSTT(STTProvider):
    """
    Local Whisper STT provider.

    Loads the Whisper model on first use and runs transcription locally.
    Supports both batch and streaming (chunked) transcription.
    """

    def __init__(self, model_size: str = "base") -> None:
        self._model_size = model_size
        self._model = None

    def _load_model(self):
        """Lazy-load the Whisper model on first transcription."""
        if self._model is None:
            import whisper

            logger.info("whisper_loading", model=self._model_size)
            self._model = whisper.load_model(self._model_size)
            logger.info("whisper_loaded", model=self._model_size)
        return self._model

    async def transcribe(self, audio: AudioChunk) -> TranscriptionResult:
        """Transcribe a complete audio buffer."""
        model = self._load_model()

        # Convert PCM16 bytes to float32 numpy array
        audio_np = np.frombuffer(audio.data, dtype=np.int16).astype(np.float32) / 32768.0

        # Whisper expects a file path or numpy array
        # Write to temp file for compatibility
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            import wave

            with wave.open(f.name, "wb") as wf:
                wf.setnchannels(audio.channels)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(audio.sample_rate)
                wf.writeframes(audio.data)

            result = model.transcribe(
                f.name,
                language="en",
                fp16=False,
            )

        text = result.get("text", "").strip()
        segments = result.get("segments", [])

        # Calculate average confidence from segments
        confidence = 0.0
        if segments:
            confidence = sum(
                seg.get("no_speech_prob", 0) for seg in segments
            ) / len(segments)
            confidence = 1.0 - confidence  # Invert: no_speech_prob -> speech confidence

        language = result.get("language", "en")

        logger.info("whisper_transcribed", text=text[:80], confidence=round(confidence, 2))

        return TranscriptionResult(
            text=text,
            confidence=confidence,
            language=language,
            is_final=True,
        )

    async def transcribe_stream(
        self, audio_stream: AsyncIterator[AudioChunk]
    ) -> AsyncIterator[TranscriptionResult]:
        """
        Streaming transcription — accumulates chunks and transcribes
        when enough audio has been collected.

        For MVP: accumulates ~2 seconds of audio then transcribes.
        Phase 2: Could use faster-whisper for true streaming.
        """
        buffer = bytearray()
        sample_rate = 16000
        # Transcribe every ~2 seconds of audio (2 * 16000 * 2 bytes = 64000)
        chunk_threshold = sample_rate * 2 * 2

        async for chunk in audio_stream:
            buffer.extend(chunk.data)
            sample_rate = chunk.sample_rate

            if len(buffer) >= chunk_threshold:
                audio = AudioChunk(
                    data=bytes(buffer),
                    sample_rate=sample_rate,
                    channels=chunk.channels,
                    format=chunk.format,
                )
                result = await self.transcribe(audio)

                if result.text:
                    yield result

                buffer.clear()

        # Transcribe remaining audio
        if buffer:
            audio = AudioChunk(
                data=bytes(buffer),
                sample_rate=sample_rate,
            )
            result = await self.transcribe(audio)
            if result.text:
                result.is_final = True
                yield result

    async def shutdown(self) -> None:
        self._model = None
        logger.info("whisper_shutdown")
