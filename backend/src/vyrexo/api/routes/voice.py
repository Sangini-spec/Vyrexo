"""Voice endpoints — list the curated voices and synthesize live previews."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, Response

from vyrexo.voice.tts.base import VoiceConfig
from vyrexo.voice.tts.edge_tts_provider import VOICE_PRESETS, EdgeTTSProvider

router = APIRouter(prefix="/voice", tags=["voice"])
logger = structlog.get_logger()

# The 5 curated, friendly voices shown in Voice Settings (label + vibe + the
# preset key the frontend sends back as the chosen voice).
CURATED_VOICES = [
    {"id": "andrew", "name": "Andrew", "accent": "American", "gender": "Male", "vibe": "Warm & conversational"},
    {"id": "ava", "name": "Ava", "accent": "American", "gender": "Female", "vibe": "Friendly & natural"},
    {"id": "brian", "name": "Brian", "accent": "American", "gender": "Male", "vibe": "Casual & upbeat"},
    {"id": "sonia", "name": "Sonia", "accent": "British", "gender": "Female", "vibe": "Crisp & clear"},
    {"id": "ryan", "name": "Ryan", "accent": "British", "gender": "Male", "vibe": "Calm & steady"},
]

_PREVIEW_TEXT = "Hey! I'm Rex, your coding partner. Let's build something great together."


@router.get("/list")
async def list_voices() -> JSONResponse:
    """Return the curated voices for the settings page."""
    return JSONResponse(CURATED_VOICES)


@router.get("/preview")
async def preview_voice(
    voice: str = Query("andrew", description="Preset key or raw edge-tts voice id"),
    rate: str = Query("+0%", description="Speech rate, e.g. -15%, +0%, +15%"),
) -> Response:
    """Synthesize a short line in the chosen voice and return it as MP3.

    Lets the settings page preview the ACTUAL backend voice instead of the
    browser's robotic speech synthesizer.
    """
    edge_voice = VOICE_PRESETS.get(voice, voice)
    provider = EdgeTTSProvider(default_voice=edge_voice)

    audio = bytearray()
    try:
        async for chunk in provider.synthesize(_PREVIEW_TEXT, VoiceConfig(voice=edge_voice, rate=rate)):
            audio.extend(chunk.data)
    except Exception as e:
        logger.warning("voice_preview_failed", voice=edge_voice, error=str(e)[:120])
        return JSONResponse({"error": "Could not synthesize preview"}, status_code=502)

    return Response(
        content=bytes(audio),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )
