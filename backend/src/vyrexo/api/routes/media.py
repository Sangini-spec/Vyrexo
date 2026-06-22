"""Media endpoints — upload a video for Gemini video understanding.

Videos (esp. screen recordings) are far too big to send as base64 over the
WebSocket, so they're POSTed here as multipart, streamed to a temp file, and
uploaded to Gemini's Files API. The returned id is referenced on a later turn.
"""

from __future__ import annotations

import asyncio
import os
import shutil
import tempfile

import structlog
from fastapi import APIRouter, UploadFile, File

router = APIRouter(prefix="/media", tags=["media"])
logger = structlog.get_logger()

_MAX_VIDEO_BYTES = 500 * 1024 * 1024  # 500 MB cap


@router.post("/video")
async def upload_video(file: UploadFile = File(...)) -> dict:
    """Stream an uploaded video to disk and hand it to Gemini. Returns a video_id."""
    from vyrexo.media import upload_video_path

    suffix = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    size = 0
    try:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > _MAX_VIDEO_BYTES:
                tmp.close()
                os.unlink(tmp.name)
                return {"ok": False, "error": "That video is over 500 MB — please trim it to a shorter clip first."}
            tmp.write(chunk)
        tmp.close()
    except Exception as e:
        try:
            tmp.close(); os.unlink(tmp.name)
        except Exception:
            pass
        logger.warning("video_save_failed", error=str(e)[:120])
        return {"ok": False, "error": "Couldn't read that video."}

    try:
        video_id = await asyncio.to_thread(upload_video_path, tmp.name)
    except Exception as e:
        logger.warning("video_upload_failed", error=str(e)[:160])
        return {"ok": False, "error": str(e)[:200]}
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass

    logger.info("video_ready", name=file.filename, video_id=video_id)
    return {"ok": True, "video_id": video_id, "name": file.filename}
