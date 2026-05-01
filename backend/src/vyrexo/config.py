from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class LLMSettings(BaseSettings):
    provider: str = "gemini"
    model_heavy: str = "gemini-2.5-pro"
    model_light: str = "gemini-2.5-flash"
    gemini_api_key: str = ""

    model_config = SettingsConfigDict(env_prefix="LLM_", extra="ignore")


class DatabaseSettings(BaseSettings):
    url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/vyrexo"

    model_config = SettingsConfigDict(env_prefix="DATABASE_", extra="ignore")


class STTSettings(BaseSettings):
    provider: str = "local"
    whisper_model_size: str = "base"

    model_config = SettingsConfigDict(env_prefix="STT_", extra="ignore")


class TTSSettings(BaseSettings):
    provider: str = "edge"
    voice: str = "en-US-GuyNeural"

    model_config = SettingsConfigDict(env_prefix="TTS_", extra="ignore")


class ChromaSettings(BaseSettings):
    persist_dir: str = str(Path.home() / ".vyrexo" / "chroma")

    model_config = SettingsConfigDict(env_prefix="CHROMA_", extra="ignore")


class ServerSettings(BaseSettings):
    host: str = "127.0.0.1"
    port: int = 8001
    log_level: str = "info"

    model_config = SettingsConfigDict(extra="ignore")


class Settings(BaseSettings):
    """Root settings — loads from .env file at project root."""

    llm: LLMSettings = Field(default_factory=LLMSettings)
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    stt: STTSettings = Field(default_factory=STTSettings)
    tts: TTSSettings = Field(default_factory=TTSSettings)
    chroma: ChromaSettings = Field(default_factory=ChromaSettings)
    server: ServerSettings = Field(default_factory=ServerSettings)

    # Gemini key at top level for convenience (also accessible via llm.gemini_api_key)
    gemini_api_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def model_post_init(self, __context: object) -> None:
        # Sync top-level GEMINI_API_KEY to llm settings
        if self.gemini_api_key and not self.llm.gemini_api_key:
            self.llm.gemini_api_key = self.gemini_api_key


def get_settings() -> Settings:
    return Settings()
