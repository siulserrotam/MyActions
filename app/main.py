from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Explainable trading intelligence API for TSM.",
    )
    app.include_router(router)
    app.mount("/dashboard", StaticFiles(directory="app/web", html=True), name="dashboard")
    return app


app = create_app()
