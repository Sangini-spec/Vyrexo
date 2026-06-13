"""
LLM Factory — Model-agnostic LLM creation.

Two kinds of LLM:
  • create_llm(...)      → the coding agents (planner/coder/etc.), heavy tier
  • create_chat_llm(...) → the conversational layer (chit-chat, simple Q&A)

These can point at different providers — e.g. heavy coding on local Ollama while
chat runs on fast Groq — so voice conversation stays snappy even when builds are
slow. Swap providers/models entirely via env vars; agents need no code changes.
"""

from __future__ import annotations

from langchain_core.language_models import BaseChatModel

from vyrexo.config import LLMSettings


def _build_llm(provider: str, model_name: str, settings: LLMSettings, temperature: float = 0.1) -> BaseChatModel:
    """Construct a LangChain chat model for the given provider + model."""
    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.gemini_api_key,
            temperature=temperature,
            convert_system_message_to_human=False,
        )

    # Groq, OpenRouter, OpenAI, and Ollama all speak the OpenAI chat API, so they
    # share one path — only the base_url and api_key differ. Agents bind tools via
    # llm.bind_tools(), which converts our tool dicts to the OpenAI function
    # schema, so tool-calling works the same across all of these.
    if provider in ("groq", "openrouter", "openai", "ollama"):
        from langchain_openai import ChatOpenAI

        default_base_urls = {
            "groq": "https://api.groq.com/openai/v1",
            "openrouter": "https://openrouter.ai/api/v1",
            "openai": "",  # use OpenAI's default endpoint
            "ollama": "http://localhost:11434/v1",  # local Ollama server
        }
        provider_keys = {
            "groq": settings.groq_api_key,
            "openrouter": settings.openrouter_api_key,
            "openai": settings.api_key,
            "ollama": "ollama",  # Ollama ignores the key, but the client requires one
        }
        base_url = settings.base_url or default_base_urls[provider]
        api_key = settings.api_key or provider_keys[provider]

        kwargs: dict = {"model": model_name, "api_key": api_key, "temperature": temperature}
        if base_url:
            kwargs["base_url"] = base_url
        # Local models on Ollama can be slow on first token; give them room.
        if provider == "ollama":
            kwargs["timeout"] = 600
        return ChatOpenAI(**kwargs)

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(model=model_name)

    raise ValueError(f"Unknown LLM provider: {provider}")


def create_llm(settings: LLMSettings, tier: str = "heavy") -> BaseChatModel:
    """Create the LLM for the coding agents. tier: "heavy" or "light"."""
    model_name = settings.model_heavy if tier == "heavy" else settings.model_light
    return _build_llm(settings.provider, model_name, settings)


def create_chat_llm(settings: LLMSettings) -> BaseChatModel:
    """Create the LLM for the conversational layer.

    Uses ``chat_provider`` / ``chat_model`` when set (e.g. fast Groq), falling
    back to the main coding provider/model otherwise. Slightly warmer sampling
    since this is for friendly conversation, not precise code.
    """
    provider = settings.chat_provider or settings.provider
    model_name = settings.chat_model or settings.model_light
    return _build_llm(provider, model_name, settings, temperature=0.6)
