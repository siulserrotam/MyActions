from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import get_session
from app.db.session import Base
from app.main import app
from app.services.live_market import LiveMarketService
from app.services.orb import OrbService
from app.services.orb_dashboard import OrbDashboardService


engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)


def override_get_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


app.dependency_overrides[get_session] = override_get_session


def test_health() -> None:
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_rejects_unsupported_ticker() -> None:
    client = TestClient(app)
    response = client.get("/predict?ticker=AAPL")

    assert response.status_code == 400


def test_orb_dashboard_returns_candidates(monkeypatch) -> None:
    def fake_session(self: OrbService, ticker: str) -> dict[str, object]:
        return {
            "ticker": ticker,
            "interval": "5m",
            "opening_range": {"high": 101.0, "low": 99.0, "open": 100.0, "close": 100.5},
            "bars": [{"time": "09:35", "open": 100.0, "high": 101.0, "low": 99.0, "close": 101.2, "volume": 1000}],
        }

    monkeypatch.setattr(OrbService, "intraday_session", fake_session)
    monkeypatch.setattr(OrbDashboardService, "_news_items", lambda self, ticker: [])

    client = TestClient(app)
    response = client.get("/orb/dashboard?ticker=NVDA")

    assert response.status_code == 200
    payload = response.json()
    assert payload["selected_ticker"] == "NVDA"
    assert len(payload["candidates"]) == 5
    assert payload["recommendation"]["suggested_entry"] > 0


def test_orb_dashboard_uses_account_capital(monkeypatch) -> None:
    def fake_session(self: OrbService, ticker: str) -> dict[str, object]:
        return {
            "ticker": ticker,
            "interval": "5m",
            "opening_range": {"high": 101.0, "low": 99.0, "open": 100.0, "close": 100.5},
            "bars": [{"time": "09:35", "open": 100.0, "high": 101.0, "low": 99.0, "close": 101.2, "volume": 1000}],
        }

    monkeypatch.setattr(OrbService, "intraday_session", fake_session)
    monkeypatch.setattr(OrbDashboardService, "_news_items", lambda self, ticker: [])

    client = TestClient(app)
    response = client.get("/orb/dashboard?ticker=NVDA&account_capital=560")

    assert response.status_code == 200
    payload = response.json()
    assert payload["rules"]["capital"] == 560
    assert payload["rules"]["risk_amount"] == 4.48
    assert payload["rules"]["reward_amount"] == 8.96


def test_market_clock() -> None:
    client = TestClient(app)
    response = client.get("/market/clock")

    assert response.status_code == 200
    assert response.json()["timezone"] == "America/New_York"


def test_market_live_batch(monkeypatch) -> None:
    def fake_quote(self, symbol: str) -> dict[str, object]:
        return {
            "symbol": symbol.upper(),
            "provider_symbol": symbol.upper(),
            "price": 407.74,
            "open": 419.67,
            "high": 420.0,
            "low": 407.0,
            "change_pct": -2.84,
            "source": "test",
            "updated_at": "2026-07-16T00:00:00+00:00",
        }

    monkeypatch.setattr(LiveMarketService, "quote", fake_quote)
    client = TestClient(app)
    response = client.get("/market/live?symbols=TSM.US,NVDA.US")

    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 2
    assert payload["items"][0]["price"] == 407.74


def test_save_daily_capital() -> None:
    client = TestClient(app)
    response = client.post(
        "/capital/daily",
        json={
            "trade_date": "2026-07-13",
            "balance": 2600,
            "target_value": 2,
            "target_type": "percent",
            "monthly_contribution": 100,
            "daily_profit": 12.5,
            "invested_accumulated": 2500,
            "monthly_invested": 100,
            "gains_accumulated": 220,
            "daily_gains": 12.5,
            "available_capital": 1522.59,
            "margin_level_pct": 406.56,
            "open_profit": -3.24,
            "risk_pct": 0.8,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["broker"] == "XTB"
    assert payload["instrument_type"] == "CFD"
    assert payload["target_profit"] == 52
    assert payload["max_loss"] == 26
    assert payload["monthly_contribution"] == 100
    assert payload["daily_profit"] == 12.5
    assert payload["invested_accumulated"] == 2500
    assert payload["monthly_invested"] == 100
    assert payload["gains_accumulated"] == 220
    assert payload["daily_gains"] == 12.5
    assert payload["available_capital"] == 1522.59
    assert payload["margin_level_pct"] == 406.56
    assert payload["open_profit"] == -3.24
    assert payload["risk_per_trade"] == 20.8


def test_capital_health() -> None:
    client = TestClient(app)
    response = client.get("/capital/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "database" in payload
    assert "latest_balance" in payload


def test_engine_universe() -> None:
    client = TestClient(app)
    response = client.get("/engine/universe")

    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] >= 10
    assert any(item["symbol"] == "GOLD" for item in payload["groups"]["commodities"])


def test_engine_calculates_dynamic_volume() -> None:
    client = TestClient(app)
    response = client.post(
        "/engine/calculate",
        json={
            "symbol": "GOLD",
            "direction": "LONG",
            "account_balance": 1059.59,
            "risk_pct": 0.8,
            "entry_price": 2400,
            "stop_price": 2390,
            "take_profit_price": 2420,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["multiplier"] == 100
    assert payload["risk_pct"] == 0.8
    assert payload["risk_amount"] == 8.48
    assert payload["raw_volume"] == 0.00848
    assert payload["capital_volume"] == 0.00441496
    assert payload["volume"] == 0.008
    assert payload["volume_basis"] == "riesgo"
    assert payload["order_type"] == "BUY STOP"


def test_engine_short_warning() -> None:
    client = TestClient(app)
    response = client.post(
        "/engine/calculate",
        json={
            "symbol": "TSM.US",
            "direction": "SHORT",
            "account_balance": 560,
            "risk_pct": 0.8,
            "entry_price": 410,
            "stop_price": 420,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["order_type"] == "SELL STOP"
    assert payload["warnings"][0]["level"] == "danger"


def test_engine_accepts_manual_volume_and_validates_risk() -> None:
    client = TestClient(app)
    response = client.post(
        "/engine/calculate",
        json={
            "symbol": "AAPL.US",
            "direction": "LONG",
            "account_balance": 2019.26,
            "risk_pct": 0.5,
            "entry_price": 334.72,
            "stop_price": 326.44,
            "take_profit_price": 351.29,
            "requested_volume": 1,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["volume"] == 1
    assert payload["volume_basis"] == "manual"
    assert payload["expected_loss"] == 8.28
    assert payload["expected_profit"] == 16.57
    assert payload["risk_ok"] is True
