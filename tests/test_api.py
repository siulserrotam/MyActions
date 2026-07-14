from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import get_session
from app.db.session import Base
from app.main import app
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


def test_save_daily_capital() -> None:
    client = TestClient(app)
    response = client.post(
        "/capital/daily",
        json={
            "trade_date": "2026-07-13",
            "balance": 2600,
            "target_value": 2,
            "target_type": "percent",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["broker"] == "XTB"
    assert payload["instrument_type"] == "CFD"
    assert payload["target_profit"] == 52
    assert payload["max_loss"] == 26
