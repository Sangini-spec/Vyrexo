"""
IntentClassifier — Classifies user input into intent categories.

Determines what kind of request the developer is making so the system
can route it appropriately.
"""

from __future__ import annotations

from enum import Enum

import structlog

logger = structlog.get_logger()


class Intent(str, Enum):
    COMMAND = "command"          # "Create a REST API", "Install Flask"
    QUESTION = "question"        # "Where is the auth logic?", "What does this function do?"
    CONVERSATION = "conversation" # "Thanks", "Sounds good", general chat
    MODE_SWITCH = "mode_switch"  # "Switch to debug mode", "Enter rubber duck mode"
    INTERRUPT = "interrupt"      # "Stop", "Wait", "Cancel"
    GIT = "git"                  # "Commit changes", "Push to main"


# Keywords for intent detection
MODE_KEYWORDS = {
    "debug mode": "debug",
    "rubber duck": "rubber_duck",
    "ship it": "ship_it",
    "whiteboard": "whiteboard",
    "normal mode": "normal",
}

INTERRUPT_KEYWORDS = {"stop", "wait", "cancel", "hold on", "pause", "nevermind", "never mind"}

GIT_KEYWORDS = {"commit", "push", "pull", "branch", "merge", "checkout", "git status", "git log"}

QUESTION_STARTERS = {"where", "what", "how", "why", "which", "who", "when", "is there", "does", "can you explain"}


class IntentClassifier:
    """
    Classifies user input into intent categories.

    MVP: Rule-based classification using keywords and patterns.
    Phase 2: Could use a small LLM for nuanced classification.
    """

    def classify(self, text: str) -> tuple[Intent, dict]:
        """
        Classify text into an intent.

        Returns (intent, metadata) where metadata contains
        intent-specific info (e.g., target mode for mode_switch).
        """
        lower = text.lower().strip()

        # Check for interrupt
        if any(lower.startswith(kw) or lower == kw for kw in INTERRUPT_KEYWORDS):
            return Intent.INTERRUPT, {}

        # Check for mode switch
        for keyword, mode in MODE_KEYWORDS.items():
            if keyword in lower:
                return Intent.MODE_SWITCH, {"target_mode": mode}

        # Check for git commands
        if any(kw in lower for kw in GIT_KEYWORDS):
            return Intent.GIT, {}

        # Check for questions
        if text.strip().endswith("?"):
            return Intent.QUESTION, {}
        if any(lower.startswith(q) for q in QUESTION_STARTERS):
            return Intent.QUESTION, {}

        # Check for conversational responses (short, no action words)
        if len(text.split()) <= 3 and not any(c in text for c in ["create", "build", "make", "add", "fix", "update", "delete", "remove", "install", "run"]):
            return Intent.CONVERSATION, {}

        # Default: it's a command
        return Intent.COMMAND, {}
