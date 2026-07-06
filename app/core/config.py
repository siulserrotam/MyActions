from functools import lru_cache
import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_runtime_dir(name: str) -> Path:
    if os.getenv("VERCEL"):
        return Path("/tmp") / name
    return Path(name)


class Settings(BaseSettings):
    app_name: str = "Trading Intelligence API"
    app_env: str = "local"
    default_ticker: str = "TSM"
    data_dir: Path = _default_runtime_dir("data")
    model_dir: Path = _default_runtime_dir("models")
    database_url: str = "sqlite:///./data/trading.db"
    redis_url: str = "redis://localhost:6379/0"
    api_key: str = ""
    jwt_secret: str = "change-me"
    supabase_url: str = ""
    supabase_anon_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8-sig",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.model_dir.mkdir(parents=True, exist_ok=True)
    return settings


settings = get_settings()
