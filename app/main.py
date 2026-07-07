from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.auth import is_dashboard_authenticated
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Explainable trading intelligence API for TSM.",
    )
    @app.middleware("http")
    async def protect_dashboard(request: Request, call_next):
        public_dashboard_assets = {"/dashboard/styles.css"}
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
