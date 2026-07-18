import hmac
import unicodedata

from fastapi import Request
from itsdangerous import BadSignature, URLSafeSerializer

from app.core.config import settings

MAX_USERNAME_LENGTH = 64
MAX_PASSWORD_LENGTH = 128


def _serializer() -> URLSafeSerializer:
    return URLSafeSerializer(settings.jwt_secret, salt="dashboard-session")


def _strip_control_chars(value: str) -> str:
    return "".join(char for char in value if char.isprintable())


def sanitize_username(username: str) -> str:
    normalized = unicodedata.normalize("NFKC", username or "")
    normalized = _strip_control_chars(normalized).strip()
    return normalized[:MAX_USERNAME_LENGTH]


def sanitize_password(password: str) -> str:
    normalized = unicodedata.normalize("NFKC", password or "")
    normalized = _strip_control_chars(normalized).strip()
    return normalized[:MAX_PASSWORD_LENGTH]


def sanitize_next_path(next_path: str) -> str:
    cleaned = _strip_control_chars(unicodedata.normalize("NFKC", next_path or "")).strip()
    if not cleaned.startswith("/") or cleaned.startswith("//") or "\\" in cleaned:
        return "/dashboard/"
    return cleaned[:256]


def verify_dashboard_credentials(username: str, password: str) -> bool:
    normalized_username = sanitize_username(username).casefold()
    normalized_password = sanitize_password(password)
    expected_username = sanitize_username(settings.admin_username).casefold()
    expected_password = sanitize_password(settings.admin_password)
    if not normalized_username or not normalized_password:
        return False
    return hmac.compare_digest(normalized_username, expected_username) and hmac.compare_digest(
        normalized_password,
        expected_password,
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
