from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


def database_connect_args(database_url: str) -> dict[str, object]:
    if "pooler.supabase.com" in database_url:
        return {"prepare_threshold": None}
    return {}


normalized_database_url = normalize_database_url(settings.database_url)
engine = create_engine(
    normalized_database_url,
    pool_pre_ping=True,
    connect_args=database_connect_args(normalized_database_url),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
