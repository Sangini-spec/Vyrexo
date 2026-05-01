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

    if settings.provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.gemini_api_key,
            temperature=0.1,
            convert_system_message_to_human=False,
        )

    # Future providers (swap via config, zero code change in agents)
    elif settings.provider == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(model=model_name)

    elif settings.provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(model=model_name)

    else:
        raise ValueError(f"Unknown LLM provider: {settings.provider}")
