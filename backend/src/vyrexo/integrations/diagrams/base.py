"""DiagramRenderer — Abstract base for architecture diagram generation (Phase 2 hook)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class DiagramOutput:
    source: str  # Mermaid/D2 source code
    svg: str = ""  # Rendered SVG
    format: str = "mermaid"  # "mermaid" | "d2"


class DiagramRenderer(ABC):
    """
    Abstract base for diagram renderers.

    Phase 2: WhiteboardMode + ArchitectAgent use this to generate
    live architecture diagrams from voice descriptions.
    """

    @abstractmethod
    async def render(self, specification: str) -> DiagramOutput:
        """Render a diagram from a specification string."""
        ...

    @abstractmethod
    async def update(self, current: DiagramOutput, delta: str) -> DiagramOutput:
        """Incrementally update an existing diagram."""
        ...
