from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "slide2graph-backend"
    version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    app_env: str = "dev"
    llm_api_base: str = ""
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_chat_path: str = "/v1/chat/completions"
    llm_timeout_seconds: float = 60.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()


def load_settings() -> Settings:
    return Settings()