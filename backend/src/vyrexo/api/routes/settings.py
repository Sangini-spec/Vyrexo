"""Settings endpoints — view and update LLM provider API keys + selection.

Keys are written to the project's ``.env`` AND applied to the live process via
``os.environ``. Because ``get_settings()`` builds a fresh ``Settings()`` on every
call (and os.environ takes precedence), changes take effect immediately — no
backend restart needed.

This is a localhost developer tool, so writing keys to the local .env is by
design. Secrets are never echoed back in full — only a masked hint.
"""

from __future__ import annotations

import os
from pathlib import Path

import structlog
from dotenv import find_dotenv
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from vyrexo.config import get_settings

router = APIRouter(prefix="/settings", tags=["settings"])
logger = structlog.get_logger()

# Secret keys — masked in responses, only overwritten when a real new value is
# sent (the UI shows a masked placeholder we must not write back).
_KEY_FIELDS = {
    "groq_api_key": "GROQ_API_KEY",
    "gemini_api_key": "GEMINI_API_KEY",
    "openrouter_api_key": "OPENROUTER_API_KEY",
    "openai_api_key": "LLM_API_KEY",
}
# Non-secret config — round-tripped as plain text.
_PLAIN_FIELDS = {
    "openai_base_url": "LLM_BASE_URL",
    "llm_provider": "LLM_PROVIDER",
    "chat_provider": "LLM_CHAT_PROVIDER",
    "model_heavy": "LLM_MODEL_HEAVY",
    "model_light": "LLM_MODEL_LIGHT",
    "chat_model": "LLM_CHAT_MODEL",
}


class SettingsUpdate(BaseModel):
    groq_api_key: str | None = None
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None
    openai_api_key: str | None = None
    openai_base_url: str | None = None
    llm_provider: str | None = None
    chat_provider: str | None = None
    model_heavy: str | None = None
    model_light: str | None = None
    chat_model: str | None = None


def _env_path() -> Path:
    found = find_dotenv(usecwd=True)
    return Path(found) if found else (Path.cwd() / ".env")


def _mask(value: str) -> str:
    v = (value or "").strip()
    if not v:
        return ""
    return "••••" + v[-4:] if len(v) > 6 else "••••"


def _looks_masked(val: str) -> bool:
    """True if the value is empty or our masked placeholder (don't write it)."""
    v = (val or "").strip()
    return v == "" or v.startswith("••••") or set(v) <= {"•"}


def _upsert_env(updates: dict[str, str]) -> None:
    """Update KEY=VALUE pairs in .env in place (preserving other lines) and
    apply them to the live process via os.environ."""
    path = _env_path()
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    seen: set[str] = set()
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key = stripped.split("=", 1)[0].strip()
        if key in updates:
            lines[i] = f"{key}={updates[key]}"
            seen.add(key)
    for key, val in updates.items():
        if key not in seen:
            lines.append(f"{key}={val}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    for key, val in updates.items():
        os.environ[key] = val


def _current_status() -> dict:
    s = get_settings()
    return {
        "keys": {
            "groq_api_key": _mask(s.llm.groq_api_key or s.groq_api_key),
            "gemini_api_key": _mask(s.llm.gemini_api_key or s.gemini_api_key),
            "openrouter_api_key": _mask(s.llm.openrouter_api_key or s.openrouter_api_key),
            "openai_api_key": _mask(s.llm.api_key),
        },
        "openai_base_url": s.llm.base_url,
        "llm_provider": s.llm.provider,
        "chat_provider": s.llm.chat_provider,
        "model_heavy": s.llm.model_heavy,
        "model_light": s.llm.model_light,
        "chat_model": s.llm.chat_model,
    }


@router.get("/keys")
async def get_keys() -> JSONResponse:
    """Current provider config with secrets masked."""
    return JSONResponse(_current_status())


@router.post("/keys")
async def set_keys(body: SettingsUpdate) -> JSONResponse:
    """Save provider keys/config to .env and apply them live."""
    data = body.model_dump()
    updates: dict[str, str] = {}

    for field, env in _KEY_FIELDS.items():
        val = data.get(field)
        if val is not None and not _looks_masked(val):
            updates[env] = val.strip()

    for field, env in _PLAIN_FIELDS.items():
        val = data.get(field)
        if val is not None:
            updates[env] = val.strip()

    if updates:
        try:
            _upsert_env(updates)
        except Exception as e:
            logger.exception("settings_write_failed")
            return JSONResponse({"ok": False, "error": str(e)[:200]}, status_code=500)
        logger.info("settings_updated", fields=sorted(updates.keys()))

    return JSONResponse({"ok": True, **_current_status()})
