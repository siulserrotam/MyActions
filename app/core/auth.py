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


def dashboard_users() -> dict[str, str]:
    configured = {}
    raw_users = settings.dashboard_users.strip()
    if raw_users:
        for item in raw_users.split(","):
            if ":" not in item:
                continue
            username, password = item.split(":", 1)
            normalized_username = sanitize_username(username).casefold()
            normalized_password = sanitize_password(password)
            if normalized_username and normalized_password:
                configured[normalized_username] = normalized_password
    if not configured:
        configured[sanitize_username(settings.admin_username).casefold()] = sanitize_password(settings.admin_password)
    return configured


def verify_dashboard_credentials(username: str, password: str) -> str | None:
    normalized_username = sanitize_username(username).casefold()
    normalized_password = sanitize_password(password)
    if not normalized_username or not normalized_password:
        return None
    expected_password = dashboard_users().get(normalized_username)
    if expected_password and hmac.compare_digest(normalized_password, expected_password):
        return normalized_username
    return None


def create_dashboard_session(username: str) -> str:
    return _serializer().dumps({"username": sanitize_username(username).casefold()})


def current_dashboard_user(request: Request | None) -> str | None:
    if request is None:
        return None
    token = request.cookies.get(settings.dashboard_session_cookie)
    if not token:
        return None
    try:
        payload = _serializer().loads(token)
    except BadSignature:
        return None
    username = sanitize_username(str(payload.get("username", ""))).casefold()
    return username if username in dashboard_users() else None


def is_dashboard_authenticated(request: Request) -> bool:
    return current_dashboard_user(request) is not None
