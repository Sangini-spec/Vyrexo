"""
Tool registry — combines all tool definitions and maps.

Agents reference tools by name. The orchestrator looks up the function
in ALL_TOOL_MAP and executes it with the provided arguments.
"""

from vyrexo.agents.tools.file_ops import FILE_TOOLS, FILE_TOOL_MAP
from vyrexo.agents.tools.terminal import TERMINAL_TOOLS, TERMINAL_TOOL_MAP
from vyrexo.agents.tools.git_ops import GIT_TOOLS, GIT_TOOL_MAP

ALL_TOOLS = FILE_TOOLS + TERMINAL_TOOLS + GIT_TOOLS

ALL_TOOL_MAP = {
    **FILE_TOOL_MAP,
    **TERMINAL_TOOL_MAP,
    **GIT_TOOL_MAP,
}

__all__ = ["ALL_TOOLS", "ALL_TOOL_MAP", "FILE_TOOLS", "TERMINAL_TOOLS", "GIT_TOOLS"]
