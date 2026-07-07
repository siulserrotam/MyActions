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
    cron_secret: str = ""
    alert_min_confidence: float = 75.0
    alert_signals: str = "COMPRAR,VENDER,ESPERAR MEJOR ENTRADA"
    intraday_alert_threshold_pct: float = 10.0
    intraday_session_bars: int = 78
    whatsapp_provider: str = "meta"
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_to_phone: str = ""
    admin_username: str = "admin"
    admin_password: str = "Admin123*"
    dashboard_session_cookie: str = "myactions_session"

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
