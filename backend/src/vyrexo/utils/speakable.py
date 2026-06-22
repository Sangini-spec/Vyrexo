"""Turn written assistant text into something that SOUNDS natural spoken aloud.

The Chat panel still shows the full text (real paths, markdown, code). This is
applied ONLY to what we hand to the TTS engine, so Rex *talks* instead of
reading markup: "app.py" becomes "app dot pie" (not "a-p-p dot p-y"), file paths
shrink to the filename, URLs become "localhost port 5000", and markdown/code
symbols are dropped.
"""

from __future__ import annotations

import re

# How common code file extensions should SOUND when spoken.
_EXT = {
    "py": "pie", "js": "J S", "ts": "T S", "tsx": "T S X", "jsx": "J S X",
    "md": "markdown", "txt": "text", "json": "Jason", "html": "H T M L",
    "css": "C S S", "scss": "S C S S", "yml": "yaml", "yaml": "yaml",
    "toml": "toml", "ini": "I N I", "cfg": "config", "sh": "shell",
    "go": "go", "rs": "Rust", "java": "Java", "rb": "Ruby", "php": "P H P",
    "cpp": "C plus plus", "sql": "sequel", "env": "E N V", "xml": "X M L",
    "csv": "C S V", "lock": "lock file",
}
_FILE_RE = re.compile(
    r"\b([A-Za-z0-9_\-]+)\.(" + "|".join(sorted(_EXT, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)


def speakable(text: str) -> str:
    """Return a spoken-friendly version of ``text``."""
    if not text:
        return text
    t = text

    # 1) Drop fenced code blocks — never read code aloud.
    t = re.sub(r"```[\s\S]*?```", " (I'll put the code on screen) ", t)

    # 2) Strip markdown markup that would otherwise be read as symbols.
    t = t.replace("`", "")
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)          # **bold**
    t = re.sub(r"\*(.+?)\*", r"\1", t)              # *italic*
    t = re.sub(r"__(.+?)__", r"\1", t)              # __bold__
    t = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", t)     # # headers
    t = re.sub(r"(?m)^\s*>\s?", "", t)              # > blockquotes
    t = re.sub(r"(?m)^\s*[-*_]{3,}\s*$", " ", t)    # --- rules
    t = t.replace("|", " ")                          # table pipes
    t = re.sub(r"(?m)^\s*[-*]\s+", "", t)           # bullet markers
    t = re.sub(r"(?m)^\s*\d+\.\s+", "", t)          # "1. " list markers

    # 3) URLs → speakable. localhost first (common for previews). The trailing
    #    matcher excludes sentence punctuation so we keep the pause after it.
    t = re.sub(r"https?://(?:localhost|127\.0\.0\.1):(\d+)[^\s.,;:!?)]*", r"localhost port \1", t)
    t = re.sub(r"https?://(?:www\.)?([^\s/]+)[^\s.,;:!?)]*", r"\1", t)

    # 4) Long file paths → just the file name (Windows abs + multi-segment POSIX).
    t = re.sub(r"[A-Za-z]:\\[^\s,;:)\]]+", lambda m: re.split(r"[\\/]", m.group(0))[-1], t)
    t = re.sub(r"(?:[\w.\-]+/){2,}[\w.\-]+", lambda m: m.group(0).rstrip("/").split("/")[-1], t)

    # 5) "app.py" → "app dot pie", "page.tsx" → "page dot T S X".
    t = _FILE_RE.sub(lambda m: f"{m.group(1)} dot {_EXT[m.group(2).lower()]}", t)

    # 6) Tidy whitespace.
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()
