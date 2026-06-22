"""Extract readable text from uploaded documents so Rex can use them as context.

Text/code/CSV/JSON are decoded directly; PDFs via pypdf; .docx via python-docx.
Returns plain text (capped) — never raises (returns "" on failure).
"""

from __future__ import annotations

import base64
import io
import os

import structlog

logger = structlog.get_logger()

_TEXT_EXT = {
    ".txt", ".md", ".markdown", ".csv", ".tsv", ".json", ".log", ".yaml", ".yml",
    ".toml", ".ini", ".cfg", ".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css",
    ".scss", ".java", ".go", ".rs", ".rb", ".php", ".c", ".cpp", ".h", ".sh",
    ".sql", ".xml", ".env", ".rst",
}
_MAX_CHARS = 24000


def _decode_data_url(data_url: str) -> bytes:
    """Accept a `data:<mime>;base64,<...>` URL or a bare base64 string."""
    if "base64," in data_url:
        data_url = data_url.split("base64,", 1)[1]
    elif "," in data_url and data_url.lower().startswith("data:"):
        data_url = data_url.split(",", 1)[1]
    return base64.b64decode(data_url)


def extract_document_text(name: str, data_url: str) -> str:
    """Return the readable text of an uploaded document, or "" if unreadable."""
    ext = os.path.splitext(name or "")[1].lower()
    try:
        raw = _decode_data_url(data_url)
    except Exception:
        logger.warning("doc_decode_failed", name=name)
        return ""

    text = ""
    try:
        if ext == ".pdf":
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(raw))
            text = "\n".join((page.extract_text() or "") for page in reader.pages[:40])
        elif ext == ".docx":
            import docx

            doc = docx.Document(io.BytesIO(raw))
            text = "\n".join(p.text for p in doc.paragraphs)
        else:
            # Text/code/csv/json, or anything we can decode as UTF-8.
            text = raw.decode("utf-8", errors="replace")
    except Exception as e:
        logger.warning("doc_extract_failed", name=name, error=str(e)[:120])
        return ""

    text = text.strip()
    if len(text) > _MAX_CHARS:
        text = text[:_MAX_CHARS] + "\n…(truncated)"
    return text


def extract_documents(documents: list[dict]) -> str:
    """Build a single labelled context blob from a list of {name, dataurl} docs."""
    chunks: list[str] = []
    for d in (documents or [])[:5]:
        if not isinstance(d, dict):
            continue
        name = d.get("name") or "document"
        payload = d.get("dataurl") or d.get("content") or ""
        text = extract_document_text(name, payload)
        if text:
            chunks.append(f"--- {name} ---\n{text}")
    return "\n\n".join(chunks)
