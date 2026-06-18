"""Web search — lets Rex actually look things up instead of reciting stale
training data.

Keyless by default (DuckDuckGo via ``ddgs``). If a ``TAVILY_API_KEY`` is
configured, uses Tavily instead for cleaner, LLM-friendly results plus a
synthesized answer. Never raises — returns empty results on failure so callers
can fall back to the model's own knowledge.
"""

from __future__ import annotations

import asyncio
import os
from urllib.parse import urlparse

import structlog

logger = structlog.get_logger()


async def web_search(query: str, max_results: int = 5) -> dict:
    """Search the web. Returns ``{"answer": str, "results": [{title, snippet, url}]}``.

    ``answer`` is a provider-synthesized summary when available (Tavily), else "".
    """
    query = (query or "").strip()
    if not query:
        return {"answer": "", "results": []}

    tavily_key = os.environ.get("TAVILY_API_KEY", "").strip()
    if tavily_key:
        try:
            return await _tavily(query, tavily_key, max_results)
        except Exception as e:
            logger.warning("tavily_search_failed", error=str(e)[:160])

    try:
        return await asyncio.to_thread(_duckduckgo, query, max_results)
    except Exception as e:
        logger.warning("web_search_failed", error=str(e)[:160])
        return {"answer": "", "results": []}


def _duckduckgo(query: str, max_results: int) -> dict:
    """Keyless DuckDuckGo search (runs in a worker thread — ddgs is sync)."""
    from ddgs import DDGS

    results: list[dict] = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=max_results):
            results.append({
                "title": r.get("title", ""),
                "snippet": r.get("body", ""),
                "url": r.get("href", ""),
            })
    logger.info("web_search_ddg", query=query[:60], results=len(results))
    return {"answer": "", "results": results}


async def _tavily(query: str, key: str, max_results: int) -> dict:
    """Tavily search — cleaner results + a synthesized answer (needs a key)."""
    import httpx

    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.post(
            "https://api.tavily.com/search",
            json={
                "api_key": key,
                "query": query,
                "max_results": max_results,
                "search_depth": "basic",
                "include_answer": True,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    results = [
        {"title": x.get("title", ""), "snippet": x.get("content", ""), "url": x.get("url", "")}
        for x in data.get("results", [])
    ]
    logger.info("web_search_tavily", query=query[:60], results=len(results))
    return {"answer": data.get("answer", "") or "", "results": results}


def source_name(url: str) -> str:
    """Human-friendly source label from a URL (e.g. 'blog.google')."""
    try:
        host = urlparse(url).netloc
        return host[4:] if host.startswith("www.") else host
    except Exception:
        return ""
