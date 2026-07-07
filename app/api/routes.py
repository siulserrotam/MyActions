from typing import Any

from fastapi import APIRouter, Depends, Form, Header, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, RedirectResponse

from app.core.config import settings
from app.core.auth import create_dashboard_session, verify_dashboard_credentials
from app.core.security import require_api_key
from app.schemas.responses import (
    BacktestResponse,
    ForecastResponse,
    HealthResponse,
    HistoryResponse,
    IndicatorsResponse,
    MetricsResponse,
    ModelResponse,
    PredictionResponse,
    TrainResponse,
)
from app.services.alerts import AlertService
from app.services.backtesting import BacktestingService
from app.services.data_provider import MarketDataService
from app.services.indicators import IndicatorService
from app.services.market_intelligence import MarketIntelligenceService
from app.services.model_registry import ModelRegistry
from app.services.training import TrainingService
from app.services.trading_signal import TradingSignalService

router = APIRouter()
WEB_DIR = settings.model_dir.parent / "app" / "web"


def validate_ticker(ticker: str) -> str:
    normalized = ticker.upper().strip()
    if normalized != settings.default_ticker:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fase 1 soporta unicamente {settings.default_ticker}.",
        )
    return normalized


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", app=settings.app_name, ticker=settings.default_ticker)


@router.get("/", response_model=HealthResponse)
def root() -> HealthResponse:
    return health()


@router.get("/login")
def login_page() -> FileResponse:
    return FileResponse("app/web/login.html")


@router.post("/login")
def login(
    username: str = Form(...),
    password: str = Form(...),
    next: str = Form("/dashboard/"),
) -> RedirectResponse:
    if not verify_dashboard_credentials(username, password):
        return RedirectResponse(url="/login?error=1", status_code=303)
    response = RedirectResponse(url=next if next.startswith("/") else "/dashboard/", status_code=303)
    response.set_cookie(
        settings.dashboard_session_cookie,
        create_dashboard_session(),
        httponly=True,
        secure=settings.app_env == "production",
        samesite="lax",
        max_age=60 * 60 * 12,
    )
    return response


@router.get("/logout")
def logout() -> RedirectResponse:
    response = RedirectResponse(url="/login", status_code=303)
    response.delete_cookie(settings.dashboard_session_cookie)
    return response


@router.get("/predict", response_model=PredictionResponse)
def predict(ticker: str = Query(settings.default_ticker)) -> PredictionResponse:
    ticker = validate_ticker(ticker)
    return TradingSignalService().predict(ticker)


@router.get("/forecast", response_model=ForecastResponse)
def forecast(ticker: str = Query(settings.default_ticker), horizon_days: int = Query(5, ge=1, le=30)) -> ForecastResponse:
    ticker = validate_ticker(ticker)
    return TradingSignalService().forecast(ticker, horizon_days)


@router.get("/history", response_model=HistoryResponse)
def history(ticker: str = Query(settings.default_ticker), limit: int = Query(250, ge=1, le=5000)) -> HistoryResponse:
    ticker = validate_ticker(ticker)
    frame = MarketDataService().get_history(ticker).tail(limit)
    payload = frame.reset_index()
    payload["date"] = payload["date"].astype(str)
    records = payload.to_dict(orient="records")
    return HistoryResponse(ticker=ticker, rows=len(records), data=records)


@router.get("/indicators", response_model=IndicatorsResponse)
def indicators(ticker: str = Query(settings.default_ticker)) -> IndicatorsResponse:
    ticker = validate_ticker(ticker)
    frame = IndicatorService().with_indicators(MarketDataService().get_history(ticker))
    latest = frame.tail(1).to_dict(orient="records")[0]
    return IndicatorsResponse(ticker=ticker, latest=latest)


@router.get("/backtesting", response_model=BacktestResponse)
def backtesting(ticker: str = Query(settings.default_ticker)) -> BacktestResponse:
    ticker = validate_ticker(ticker)
    return BacktestingService().run(ticker)


@router.get("/metrics", response_model=MetricsResponse)
def metrics(ticker: str = Query(settings.default_ticker)) -> MetricsResponse:
    ticker = validate_ticker(ticker)
    backtest = BacktestingService().run(ticker)
    return MetricsResponse(ticker=ticker, metrics=backtest.summary)


@router.get("/model", response_model=ModelResponse)
def model(ticker: str = Query(settings.default_ticker)) -> ModelResponse:
    ticker = validate_ticker(ticker)
    return ModelRegistry().current(ticker)


@router.post("/train", response_model=TrainResponse, dependencies=[Depends(require_api_key)])
def train(ticker: str = Query(settings.default_ticker)) -> TrainResponse:
    ticker = validate_ticker(ticker)
    return TrainingService().train(ticker)


@router.post("/retrain", response_model=TrainResponse, dependencies=[Depends(require_api_key)])
def retrain(ticker: str = Query(settings.default_ticker)) -> TrainResponse:
    ticker = validate_ticker(ticker)
    return TrainingService().train(ticker, force=True)


@router.get("/alerts/evaluate")
def evaluate_alerts(
    ticker: str = Query(settings.default_ticker),
    notify: bool = Query(False),
    _: None = Depends(require_api_key),
) -> dict[str, Any]:
    ticker = validate_ticker(ticker)
    return AlertService().evaluate(ticker, notify=notify).to_dict()


@router.get("/alerts/intraday")
def evaluate_intraday_alerts(
    ticker: str = Query(settings.default_ticker),
    notify: bool = Query(False),
    _: None = Depends(require_api_key),
) -> dict[str, Any]:
    ticker = validate_ticker(ticker)
    return AlertService().evaluate_intraday(ticker, notify=notify)


@router.get("/cron/daily-signal")
def daily_signal_cron(
    authorization: str | None = Header(default=None),
    x_cron_secret: str | None = Header(default=None),
) -> dict[str, Any]:
    if settings.cron_secret:
        expected = f"Bearer {settings.cron_secret}"
        if authorization != expected and x_cron_secret != settings.cron_secret:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cron secret invalido.")
    return AlertService().evaluate(settings.default_ticker, notify=True).to_dict()


@router.get("/cron/intraday-signal")
def intraday_signal_cron(
    authorization: str | None = Header(default=None),
    x_cron_secret: str | None = Header(default=None),
) -> dict[str, Any]:
    if settings.cron_secret:
        expected = f"Bearer {settings.cron_secret}"
        if authorization != expected and x_cron_secret != settings.cron_secret:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cron secret invalido.")
    return AlertService().evaluate_intraday(settings.default_ticker, notify=True)


@router.get("/intelligence/news")
def intelligence_news(ticker: str = Query(settings.default_ticker)) -> dict[str, Any]:
    ticker = validate_ticker(ticker)
    return MarketIntelligenceService().news_assessment(ticker)


@router.get("/intelligence/opportunities")
def intelligence_opportunities() -> dict[str, Any]:
    return MarketIntelligenceService().opportunities()


@router.get("/intelligence/dividends")
def intelligence_dividends(ticker: str = Query(settings.default_ticker)) -> dict[str, Any]:
    ticker = validate_ticker(ticker)
    return MarketIntelligenceService().dividends(ticker)
