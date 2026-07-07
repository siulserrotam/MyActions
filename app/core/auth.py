import hmac

from fastapi import Request
from itsdangerous import BadSignature, URLSafeSerializer

from app.core.config import settings


def _serializer() -> URLSafeSerializer:
    return URLSafeSerializer(settings.jwt_secret, salt="dashboard-session")


def verify_dashboard_credentials(username: str, password: str) -> bool:
    normalized_username = username.strip().casefold()
    expected_username = settings.admin_username.strip().casefold()
    return hmac.compare_digest(normalized_username, expected_username) and hmac.compare_digest(
        password,
        settings.admin_password,
    )


def create_dashboard_session() -> str:
    return _serializer().dumps({"username": settings.admin_username})


def is_dashboard_authenticated(request: Request) -> bool:
    token = request.cookies.get(settings.dashboard_session_cookie)
    if not token:
        return False
    try:
        payload = _serializer().loads(token)
    except BadSignature:
        return False
    return str(payload.get("username", "")).casefold() == settings.admin_username.casefold()
