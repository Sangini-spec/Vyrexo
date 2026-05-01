"""
CodebaseIndexer — Indexes project files into Chroma vector DB.

Uses AST-aware chunking for Python/JS files and generic text chunking
for everything else. Each chunk stores metadata: file path, function name,
class name, language, chunk type.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import structlog

logger = structlog.get_logger()

# File extensions to index
INDEXABLE_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx",
    ".java", ".go", ".rs", ".cpp", ".c", ".h",
    ".html", ".css", ".scss",
    ".json", ".yaml", ".yml", ".toml",
    ".md", ".txt", ".env.example",
    ".sql", ".sh", ".bash",
    ".dockerfile", ".Dockerfile",
}

# Directories to skip
SKIP_DIRS = {
    "node_modules", "__pycache__", ".git", ".venv", "venv",
    "dist", "build", ".next", ".cache", "coverage",
    ".mypy_cache", ".pytest_cache", ".ruff_cache",
    "egg-info", ".egg-info", ".tox",
}

# Max file size to index (500KB)
MAX_FILE_SIZE = 500_000

# Chunk size for splitting
CHUNK_SIZE = 800  # characters
CHUNK_OVERLAP = 100


class CodebaseIndexer:
    """
    Indexes a project directory into Chroma for semantic search.

    Each file is split into chunks with metadata for precise retrieval.
    Supports incremental re-indexing via content hashing.
    """

    def __init__(self, persist_dir: str = "") -> None:
        self._persist_dir = persist_dir
        self._client = None
        self._collection = None

    def _get_collection(self, project_id: str):
        """Lazy-init Chroma client and collection."""
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

    async def index_project(self, project_path: str, project_id: str = "") -> dict:
        """
        Index all supported files in a project directory.

        Returns stats about what was indexed.
        """
        root = Path(project_path).resolve()
        if not root.exists():
            return {"error": f"Project path not found: {project_path}"}

        if not project_id:
            project_id = hashlib.md5(str(root).encode()).hexdigest()[:12]

        collection = self._get_collection(project_id)

        files_indexed = 0
        chunks_added = 0
        errors = []

        all_ids = []
        all_docs = []
        all_metas = []

        for file_path in self._walk_project(root):
            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                if not content.strip():
                    continue

                rel_path = str(file_path.relative_to(root))
                language = self._detect_language(file_path)
                content_hash = hashlib.md5(content.encode()).hexdigest()

                chunks = self._chunk_file(content, rel_path, language)

                for i, chunk in enumerate(chunks):
                    chunk_id = f"{content_hash}_{i}"
                    all_ids.append(chunk_id)
                    all_docs.append(chunk["text"])
                    all_metas.append({
                        "file_path": rel_path,
                        "language": language,
                        "chunk_index": i,
                        "chunk_type": chunk.get("type", "text"),
                        "function_name": chunk.get("function_name", ""),
                        "class_name": chunk.get("class_name", ""),
                    })
                    chunks_added += 1

                files_indexed += 1

            except Exception as e:
                errors.append({"file": str(file_path), "error": str(e)})

        # Batch upsert into Chroma
        if all_ids:
            # Chroma has batch size limits, upsert in chunks of 500
            batch_size = 500
            for i in range(0, len(all_ids), batch_size):
                collection.upsert(
                    ids=all_ids[i:i + batch_size],
                    documents=all_docs[i:i + batch_size],
                    metadatas=all_metas[i:i + batch_size],
                )

        logger.info(
            "index_complete",
            files=files_indexed,
            chunks=chunks_added,
            errors=len(errors),
        )

        return {
            "project_id": project_id,
            "files_indexed": files_indexed,
            "chunks_added": chunks_added,
            "errors": errors[:5],
        }

    def _walk_project(self, root: Path):
        """Walk project directory, yielding indexable files."""
        for path in root.rglob("*"):
            if any(skip in path.parts for skip in SKIP_DIRS):
                continue
            if not path.is_file():
                continue
            if path.suffix not in INDEXABLE_EXTENSIONS and path.name not in ("Dockerfile", "Makefile"):
                continue
            if path.stat().st_size > MAX_FILE_SIZE:
                continue
            yield path

    def _detect_language(self, path: Path) -> str:
        """Detect programming language from file extension."""
        ext_map = {
            ".py": "python", ".js": "javascript", ".ts": "typescript",
            ".tsx": "typescript", ".jsx": "javascript", ".java": "java",
            ".go": "go", ".rs": "rust", ".cpp": "cpp", ".c": "c",
            ".html": "html", ".css": "css", ".scss": "scss",
            ".json": "json", ".yaml": "yaml", ".yml": "yaml",
            ".toml": "toml", ".md": "markdown", ".sql": "sql",
            ".sh": "bash", ".bash": "bash",
        }
        return ext_map.get(path.suffix, "text")

    def _chunk_file(self, content: str, rel_path: str, language: str) -> list[dict]:
        """
        Split file content into chunks.

        For Python: tries to split by functions/classes first.
        For everything else: splits by lines with overlap.
        """
        if language == "python":
            chunks = self._chunk_python(content, rel_path)
            if chunks:
                return chunks

        return self._chunk_generic(content, rel_path)

    def _chunk_python(self, content: str, rel_path: str) -> list[dict]:
        """Split Python file by functions and classes."""
        chunks = []
        lines = content.split("\n")
        current_block: list[str] = []
        current_type = "module"
        current_name = ""

        for line in lines:
            stripped = line.lstrip()

            if stripped.startswith("def ") or stripped.startswith("async def "):
                # Save previous block
                if current_block:
                    text = "\n".join(current_block)
                    if text.strip():
                        chunks.append({
                            "text": f"# File: {rel_path}\n{text}",
                            "type": current_type,
                            "function_name": current_name,
                        })

                # Start new function block
                current_block = [line]
                current_type = "function"
                name_part = stripped.split("def ")[1] if "def " in stripped else ""
                current_name = name_part.split("(")[0].strip()

            elif stripped.startswith("class "):
                if current_block:
                    text = "\n".join(current_block)
                    if text.strip():
                        chunks.append({
                            "text": f"# File: {rel_path}\n{text}",
                            "type": current_type,
                            "class_name": current_name if current_type == "class" else "",
                            "function_name": current_name if current_type == "function" else "",
                        })

                current_block = [line]
                current_type = "class"
                current_name = stripped.split("class ")[1].split("(")[0].split(":")[0].strip()
            else:
                current_block.append(line)

        # Don't forget the last block
        if current_block:
            text = "\n".join(current_block)
            if text.strip():
                chunks.append({
                    "text": f"# File: {rel_path}\n{text}",
                    "type": current_type,
                    "function_name": current_name if current_type == "function" else "",
                    "class_name": current_name if current_type == "class" else "",
                })

        return chunks

    def _chunk_generic(self, content: str, rel_path: str) -> list[dict]:
        """Split content into overlapping text chunks."""
        chunks = []
        start = 0

        while start < len(content):
            end = start + CHUNK_SIZE
            chunk_text = content[start:end]

            # Try to break at a newline for cleaner chunks
            if end < len(content):
                last_newline = chunk_text.rfind("\n")
                if last_newline > CHUNK_SIZE // 2:
                    chunk_text = chunk_text[:last_newline]
                    end = start + last_newline

            if chunk_text.strip():
                chunks.append({
                    "text": f"# File: {rel_path}\n{chunk_text}",
                    "type": "text",
                })

            start = end - CHUNK_OVERLAP if end < len(content) else len(content)

        return chunks
