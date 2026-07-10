from fastapi.testclient import TestClient

from app.main import app
from app.services.orb import OrbService
from app.services.orb_dashboard import OrbDashboardService


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
    assert len(payload["candidates"]) == 4
    assert payload["recommendation"]["suggested_entry"] > 0
