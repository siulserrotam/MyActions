from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_rejects_unsupported_ticker() -> None:
    client = TestClient(app)
    response = client.get("/predict?ticker=AAPL")

    assert response.status_code == 400
