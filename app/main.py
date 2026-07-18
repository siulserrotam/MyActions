from pathlib import Path
import logging

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.auth import is_dashboard_authenticated
from app.core.config import settings
from app.db import models  # noqa: F401
from app.db.session import Base, engine

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    expose_api_docs = settings.app_env != "production"
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Explainable trading intelligence API for TSM.",
        docs_url="/docs" if expose_api_docs else None,
        redoc_url="/redoc" if expose_api_docs else None,
        openapi_url="/openapi.json" if expose_api_docs else None,
    )

    @app.on_event("startup")
    def create_runtime_tables() -> None:
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as exc:
            logger.warning("No se pudieron crear/verificar tablas de base de datos: %s", exc)

    @app.middleware("http")
    async def protect_dashboard(request: Request, call_next):
        public_dashboard_assets = {"/dashboard/styles.css", "/dashboard/app.js"}
        if (
            request.url.path.startswith("/dashboard")
            and request.url.path not in public_dashboard_assets
            and not is_dashboard_authenticated(request)
        ):
            return RedirectResponse(url="/login", status_code=303)
        return await call_next(request)

    app.include_router(router)
    web_dir = Path(__file__).resolve().parent / "web"
    app.mount("/dashboard", StaticFiles(directory=web_dir, html=True), name="dashboard")
    return app


app = create_app()
