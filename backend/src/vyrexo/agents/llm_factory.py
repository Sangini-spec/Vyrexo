"""
LLM Factory — Model-agnostic LLM creation.

Swap the entire AI engine by changing one env variable.
Agents specify "heavy" or "light" tier; factory picks the right model.
"""

from __future__ import annotations

from langchain_core.language_models import BaseChatModel

from vyrexo.config import LLMSettings


def create_llm(settings: LLMSettings, tier: str = "heavy") -> BaseChatModel:
    """
    Create a LangChain-compatible LLM instance.

    Args:
        settings: LLM configuration
        tier: "heavy" (Gemini Pro) or "light" (Gemini Flash)
    """
    model_name = settings.model_heavy if tier == "heavy" else settings.model_light
    provider = settings.provider

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.gemini_api_key,
            temperature=0.1,
            convert_system_message_to_human=False,
        )

    # Groq, OpenRouter, and OpenAI all speak the OpenAI chat API, so they share
    # one path — only the base_url and api_key differ. Agents bind tools via
    # llm.bind_tools(), which converts our tool dicts to the OpenAI function
    # schema, so tool-calling works the same across all of these.
    if provider in ("groq", "openrouter", "openai"):
        from langchain_openai import ChatOpenAI

        default_base_urls = {
            "groq": "https://api.groq.com/openai/v1",
            "openrouter": "https://openrouter.ai/api/v1",
            "openai": "",  # use OpenAI's default endpoint
        }
        provider_keys = {
            "groq": settings.groq_api_key,
            "openrouter": settings.openrouter_api_key,
            "openai": settings.api_key,
        }
        base_url = settings.base_url or default_base_urls[provider]
        api_key = settings.api_key or provider_keys[provider]

        kwargs: dict = {"model": model_name, "api_key": api_key, "temperature": 0.1}
        if base_url:
            kwargs["base_url"] = base_url
        return ChatOpenAI(**kwargs)

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(model=model_name)

    raise ValueError(f"Unknown LLM provider: {provider}")
