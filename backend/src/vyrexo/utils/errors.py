"""Helpers for turning raw exceptions into clean, speakable messages.

When an upstream service (Gemini, the network, etc.) fails, the raw exception
text — e.g. ``ResourceExhausted: 429 Quota exceeded for quota metric ...`` — is
useless to a user and jarring when read aloud by the TTS engine. ``friendly_error``
maps the common failure classes to short, human messages and falls back to a
generic line for anything unrecognized.
"""

from __future__ import annotations

# Substrings (matched case-insensitively against the exception text) grouped by
# the friendly message they should produce. Order matters: the first group that
# matches wins, so more specific buckets come before broader ones.
_ERROR_BUCKETS: list[tuple[tuple[str, ...], str]] = [
    (
        ("429", "rate limit", "ratelimit", "quota", "resourceexhausted",
         "resource exhausted", "resource has been exhausted"),
        "I've hit a rate limit on the AI service. Please give it a moment and try again.",
    ),
    (
        ("api key", "api_key", "unauthenticated", "permission_denied",
         "permission denied", "invalid authentication", "401", "403"),
        "There's a problem with my AI credentials. Please check the API key configuration.",
    ),
    (
        ("timeout", "timed out", "deadline", "connection", "network",
         "unavailable", "503", "502", "504"),
        "I'm having trouble reaching the AI service right now. Please try again in a moment.",
    ),
]

_GENERIC = "Something went wrong on my end. Please try again."


def friendly_error(exc: Exception | str) -> str:
    """Return a short, speakable message for an exception (never the raw text)."""
    text = (str(exc) or "").lower()
    for needles, message in _ERROR_BUCKETS:
        if any(n in text for n in needles):
            return message
    return _GENERIC
