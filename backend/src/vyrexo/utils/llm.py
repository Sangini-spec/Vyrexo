"""Helpers for working with LLM responses."""

from __future__ import annotations

from typing import Any


def response_text(response: Any) -> str:
    """Normalize an LLM message's content to a plain string.

    LangChain chat models return ``AIMessage.content`` as either a ``str`` or a
    list of content parts (strings and/or ``{"type": "text", "text": ...}``
    dicts — Gemini does the latter for some replies, e.g. after tool use). Code
    that calls ``.lower()``/``.strip()`` on the raw content crashes on the list
    form, so always funnel responses through here first.
    """
    content = getattr(response, "content", response)

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                text = part.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "".join(parts)

    return "" if content is None else str(content)
