"""GitHub agent tools — let Rex push a project to GitHub / add CI by voice.

These read the token from settings server-side (no token parameter is exposed to
the model), so the secret never enters the LLM context or transcript.
"""

from __future__ import annotations

import structlog

from vyrexo.integrations import github as gh

logger = structlog.get_logger()


async def github_push(
    repo: str,
    commit_message: str = "Update from Rex",
    private: bool = True,
    working_dir: str = ".",
) -> dict:
    """Push the project folder to GitHub (creating the repo if needed)."""
    try:
        return await gh.push_folder_to_github(
            working_dir, repo, commit_message=commit_message, private=private
        )
    except gh.GitHubError as e:
        return {"error": str(e)}


async def github_generate_ci(working_dir: str = ".", overwrite: bool = False) -> dict:
    """Generate a GitHub Actions CI workflow for the project."""
    try:
        return await gh.generate_ci_pipeline(working_dir, overwrite=overwrite)
    except gh.GitHubError as e:
        return {"error": str(e)}


GITHUB_TOOLS = [
    {
        "name": "github_push",
        "description": (
            "Push the current project to GitHub, creating the repository if it "
            "doesn't exist. Give the repo as a URL, owner/name, or just a name."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "repo": {"type": "string", "description": "Repo URL, owner/name, or a name to create"},
                "commit_message": {"type": "string", "description": "Commit message (optional)"},
                "private": {"type": "boolean", "description": "Create as a private repo (default true)"},
            },
            "required": ["repo"],
        },
    },
    {
        "name": "github_generate_ci",
        "description": "Generate a GitHub Actions CI workflow (.github/workflows/ci.yml) for the project, auto-detecting the language.",
        "parameters": {
            "type": "object",
            "properties": {
                "overwrite": {"type": "boolean", "description": "Overwrite an existing workflow (default false)"},
            },
        },
    },
]

GITHUB_TOOL_MAP = {
    "github_push": github_push,
    "github_generate_ci": github_generate_ci,
}
