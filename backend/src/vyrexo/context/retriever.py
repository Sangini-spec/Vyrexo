"""
ContextRetriever — Semantic search over the indexed codebase.

Uses Chroma's built-in embedding + similarity search to find
relevant code chunks for a given query.
"""

from __future__ import annotations

import hashlib
from typing import Any

import structlog

logger = structlog.get_logger()


class ContextRetriever:
    """
    Retrieves relevant code context from the Chroma vector DB.

    Supports:
    - Semantic search ("where is the authentication logic?")
    - File-filtered search ("find functions in auth.py")
    - Metadata-filtered search ("find all Python classes")
    """

    def __init__(self, persist_dir: str = "") -> None:
        self._persist_dir = persist_dir
        self._client = None
        self._collection = None

    def _get_collection(self, project_id: str):
        if self._collection is not None:
            return self._collection

        import chromadb

        if self._persist_dir:
            self._client = chromadb.PersistentClient(path=self._persist_dir)
        else:
            self._client = chromadb.Client()

        collection_name = f"codebase_{project_id.replace('/', '_').replace('\\', '_')[:50]}"
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        return self._collection

    async def search(
        self,
        query: str,
        project_id: str,
        n_results: int = 10,
        file_filter: str | None = None,
        language_filter: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Search the codebase for relevant code chunks.

        Args:
            query: Natural language query (e.g., "where is the auth logic?")
            project_id: Project identifier
            n_results: Max number of results
            file_filter: Only search in files matching this path substring
            language_filter: Only search files of this language
        """
        collection = self._get_collection(project_id)

        if collection.count() == 0:
            return []

        # Build metadata filter
        where_filter = None
        conditions = []

        if file_filter:
            conditions.append({"file_path": {"$contains": file_filter}})
        if language_filter:
            conditions.append({"language": language_filter})

        if len(conditions) == 1:
            where_filter = conditions[0]
        elif len(conditions) > 1:
            where_filter = {"$and": conditions}

        try:
            results = collection.query(
                query_texts=[query],
                n_results=min(n_results, collection.count()),
                where=where_filter,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            logger.error("retriever_search_error", error=str(e))
            return []

        # Format results
        chunks = []
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                meta = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 0

                chunks.append({
                    "content": doc,
                    "file_path": meta.get("file_path", ""),
                    "language": meta.get("language", ""),
                    "chunk_type": meta.get("chunk_type", ""),
                    "function_name": meta.get("function_name", ""),
                    "class_name": meta.get("class_name", ""),
                    "relevance": round(1 - distance, 3),  # Convert distance to similarity
                })

        logger.info("retriever_search", query=query[:50], results=len(chunks))
        return chunks

    async def get_file_summary(self, project_id: str) -> list[dict]:
        """Get a summary of all indexed files and their chunk counts."""
        collection = self._get_collection(project_id)

        if collection.count() == 0:
            return []

        all_data = collection.get(include=["metadatas"])
        file_counts: dict[str, int] = {}

        for meta in all_data.get("metadatas", []):
            fp = meta.get("file_path", "unknown")
            file_counts[fp] = file_counts.get(fp, 0) + 1

        return [
            {"file_path": fp, "chunks": count}
            for fp, count in sorted(file_counts.items())
        ]
