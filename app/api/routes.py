from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Form, Header, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.auth import create_dashboard_session, sanitize_next_path, verify_dashboard_credentials
from app.core.security import require_api_key
from app.db.session import get_session, normalized_database_url
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
from app.services.trading_plan import TradingPlanService
from app.services.orb import OrbService
from app.services.orb_dashboard import OrbDashboardService
from app.services.capital import CapitalService
from app.services.market_clock import MarketClockService
from app.services.decision_engine import DecisionEngineService
from app.services.live_market import LiveMarketService

router = APIRouter()
WEB_DIR = settings.model_dir.parent / "app" / "web"


class DailyCapitalRequest(BaseModel):
    trade_date: date
    balance: float = Field(gt=0)
    target_value: float = Field(ge=0)
    target_type: str = "money"
    monthly_contribution: float = 0
    daily_profit: float = 0
    invested_accumulated: float = 0
    monthly_invested: float = 0
    gains_accumulated: float = 0
    daily_gains: float = 0
    available_capital: float = 0
    margin_level_pct: float = 0
    open_profit: float = 0
    operation1_result: float = 0
    operation2_result: float = 0
    daily_result_status: str = "pending"
    risk_pct: float = Field(default=1, gt=0, le=10)
    notes: str = ""


class EngineCalculateRequest(BaseModel):
    symbol: str
    direction: str = Field(pattern="^(LONG|SHORT)$")
    account_balance: float = Field(gt=0)
    risk_pct: float = Field(gt=0, le=10)
    entry_price: float = Field(gt=0)
    stop_price: float = Field(gt=0)
    take_profit_price: float | None = Field(default=None, gt=0)
    requested_volume: float | None = Field(default=None, gt=0)


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
    response = RedirectResponse(url=sanitize_next_path(next), status_code=303)
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
def intelligence_opportunities(symbols: str | None = Query(default=None)) -> dict[str, Any]:
    parsed_symbols = [item.strip().upper() for item in symbols.split(",")] if symbols else None
    return MarketIntelligenceService().opportunities(parsed_symbols)


@router.get("/intelligence/dividends")
def intelligence_dividends(ticker: str = Query(settings.default_ticker)) -> dict[str, Any]:
    ticker = validate_ticker(ticker)
    return MarketIntelligenceService().dividends(ticker)


@router.get("/plan/active-trading")
def active_trading_plan(ticker: str = Query(settings.default_ticker)) -> dict[str, Any]:
    ticker = validate_ticker(ticker)
    return TradingPlanService().build(ticker)


@router.get("/orb/session")
def orb_session(ticker: str = Query("NVDA")) -> dict[str, Any]:
    try:
        return OrbService().intraday_session(ticker)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/orb/dashboard")
def orb_dashboard(
    ticker: str = Query("NVDA"),
    account_capital: float | None = Query(default=None, gt=0),
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    try:
        capital = CapitalService().latest(session)
    except Exception:
        capital = None
    if account_capital:
        capital = {
            "balance": account_capital,
            "target_value": round(account_capital * 0.016, 2),
            "target_type": "money",
            "target_profit": round(account_capital * 0.016, 2),
            "max_loss": round(account_capital * 0.008, 2),
            "risk_per_trade": round(account_capital * 0.008, 2),
            "reward_per_trade": round(account_capital * 0.016, 2),
            "buying_power": round(account_capital * 4, 2),
            "broker": "XTB",
            "instrument_type": "CFD",
            "source": "dashboard",
        }
    return OrbDashboardService().build(ticker, capital=capital)


@router.get("/orb/calculate")
def orb_calculate(
    ticker: str = Query("NVDA"),
    opening_high: float = Query(..., gt=0),
    opening_low: float = Query(..., gt=0),
    entry_price: float = Query(..., gt=0),
    wins_today: int = Query(0, ge=0, le=2),
    losses_today: int = Query(0, ge=0, le=1),
    account_capital: float | None = Query(default=None, gt=0),
) -> dict[str, Any]:
    try:
        return OrbService().calculate(
            ticker=ticker,
            opening_high=opening_high,
            opening_low=opening_low,
            entry_price=entry_price,
            wins_today=wins_today,
            losses_today=losses_today,
            account_capital=account_capital,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/market/clock")
def market_clock() -> dict[str, object]:
    return MarketClockService().snapshot()


@router.get("/market/live")
def market_live(symbols: str = Query("TSM.US,NVDA.US,US100,GOLD,BTCUSD")) -> dict[str, object]:
    parsed_symbols = [item.strip().upper() for item in symbols.split(",") if item.strip()]
    return LiveMarketService().quotes(parsed_symbols[:20])


@router.get("/market/live/{symbol}")
def market_live_symbol(symbol: str) -> dict[str, object]:
    try:
        return LiveMarketService().quote(symbol)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No se pudo cargar precio live para {symbol}: {exc}",
        ) from exc


@router.get("/engine/universe")
def engine_universe() -> dict[str, object]:
    return DecisionEngineService().universe()


@router.post("/engine/calculate")
def engine_calculate(payload: EngineCalculateRequest) -> dict[str, object]:
    try:
        return DecisionEngineService().calculate(
            symbol=payload.symbol,
            direction=payload.direction,  # type: ignore[arg-type]
            account_balance=payload.account_balance,
            risk_pct=payload.risk_pct,
            entry_price=payload.entry_price,
            stop_price=payload.stop_price,
            take_profit_price=payload.take_profit_price,
            requested_volume=payload.requested_volume,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/capital/daily")
def daily_capital(
    limit: int = Query(30, ge=1, le=120),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    service = CapitalService()
    try:
        return {
            "latest": service.latest(session),
            "history": service.history(session, limit=limit),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Base de datos no disponible: {exc}",
        ) from exc


@router.get("/capital/health")
def capital_health(session: Session = Depends(get_session)) -> dict[str, object]:
    database_url = normalized_database_url
    masked_database = database_url
    if "@" in masked_database:
        masked_database = f"{masked_database.split('://', 1)[0]}://***@{masked_database.rsplit('@', 1)[-1]}"
    try:
        session.execute(text("SELECT 1"))
        latest = CapitalService().latest(session)
        return {
            "status": "ok",
            "database": masked_database,
            "is_sqlite": database_url.startswith("sqlite"),
            "looks_like_placeholder": "example.com" in database_url,
            "latest_trade_date": latest["trade_date"] if latest else None,
            "latest_balance": latest["balance"] if latest else None,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Base de datos no disponible: {exc}",
        ) from exc


@router.post("/capital/daily")
def save_daily_capital(
    payload: DailyCapitalRequest,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    try:
        return CapitalService().save(
            session=session,
            trade_date=payload.trade_date,
            balance=payload.balance,
            target_value=payload.target_value,
            target_type=payload.target_type,
            monthly_contribution=payload.monthly_contribution,
            daily_profit=payload.daily_profit,
            invested_accumulated=payload.invested_accumulated,
            monthly_invested=payload.monthly_invested,
            gains_accumulated=payload.gains_accumulated,
            daily_gains=payload.daily_gains,
            available_capital=payload.available_capital,
            margin_level_pct=payload.margin_level_pct,
            open_profit=payload.open_profit,
            operation1_result=payload.operation1_result,
            operation2_result=payload.operation2_result,
            daily_result_status=payload.daily_result_status,
            risk_pct=payload.risk_pct,
            notes=payload.notes,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Base de datos no disponible: {exc}",
        ) from exc
