"""Video understanding via Gemini.

Gemini processes a video natively — BOTH the visuals (motion, screens, UI) and
the AUDIO (narration) — so a screen recording with a voiceover is understood in
one shot, no ffmpeg/Whisper needed. Large recordings go through the Files API
(upload → poll until ACTIVE → reference in generate).
"""

from __future__ import annotations

import os
import tempfile
import time

import structlog

logger = structlog.get_logger()

_client = None
MODEL = "gemini-2.5-flash"


def _get_client():
    global _client
    if _client is None:
        from google import genai

        key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not key:
            raise RuntimeError("Video understanding needs a GEMINI_API_KEY (Gemini handles video).")
        _client = genai.Client(api_key=key)
    return _client


def _state(f) -> str:
    return getattr(f.state, "name", str(f.state))


def upload_video_path(path: str) -> str:
    """Upload a video file to Gemini and return its id once it's ACTIVE."""
    client = _get_client()
    f = client.files.upload(file=path)
    deadline = time.time() + 300
    while _state(f) == "PROCESSING" and time.time() < deadline:
        time.sleep(2)
        f = client.files.get(name=f.name)
    state = _state(f)
    if state != "ACTIVE":
        raise RuntimeError(f"Gemini couldn't process that video (state: {state}).")
    logger.info("video_uploaded", file=f.name)
    return f.name


def upload_video_bytes(data: bytes, suffix: str = ".mp4") -> str:
    """Upload video bytes to Gemini (writes a temp file first)."""
    with tempfile.NamedTemporaryFile(suffix=suffix or ".mp4", delete=False) as tmp:
        tmp.write(data)
        path = tmp.name
    try:
        return upload_video_path(path)
    finally:
        try:
            os.unlink(path)
        except Exception:
            pass


def understand_video(video_id: str, prompt: str) -> str:
    """Ask Gemini about an already-uploaded video. Retries transient overloads."""
    client = _get_client()
    f = client.files.get(name=video_id)
    last: Exception | None = None
    for attempt in range(4):
        try:
            resp = client.models.generate_content(model=MODEL, contents=[f, prompt])
            return (resp.text or "").strip()
        except Exception as e:  # noqa: BLE001
            last = e
            msg = str(e)
            transient = any(s in msg for s in ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "overloaded"))
            if transient and attempt < 3:
                time.sleep(6 * (attempt + 1))
                continue
            raise
    if last:
        raise last
    return ""
