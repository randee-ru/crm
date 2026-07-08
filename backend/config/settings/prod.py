"""Настройки для production."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

from .base import *  # noqa: F401,F403


def _load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv(Path("/app/.env.prod"))
_load_dotenv(BASE_DIR / ".env.prod")
_load_dotenv(BASE_DIR / "backend" / ".env")

DEBUG = False

_hosts = [
    host.strip()
    for host in os.getenv(
        "DJANGO_ALLOWED_HOSTS",
        "crm.sportmax.fit,localhost,backend,127.0.0.1",
    ).split(",")
    if host.strip()
]
ALLOWED_HOSTS = _hosts

_public_app_url = os.getenv("PUBLIC_APP_URL", "https://crm.sportmax.fit").strip()
_trusted = [
    origin.strip()
    for origin in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", _public_app_url).split(",")
    if origin.strip()
]
if _public_app_url and _public_app_url not in _trusted:
    _trusted.append(_public_app_url)
CSRF_TRUSTED_ORIGINS = _trusted

try:
    _host = urlparse(_public_app_url).hostname
    if _host and _host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_host)
except Exception:
    pass

# Re-read secrets after dotenv
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", SECRET_KEY)
DATABASES["default"].update(
    {
        "NAME": os.getenv("POSTGRES_DB", DATABASES["default"]["NAME"]),
        "USER": os.getenv("POSTGRES_USER", DATABASES["default"]["USER"]),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", DATABASES["default"]["PASSWORD"]),
        "HOST": os.getenv("POSTGRES_HOST", DATABASES["default"]["HOST"]),
        "PORT": os.getenv("POSTGRES_PORT", DATABASES["default"]["PORT"]),
    }
)

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = os.getenv("DJANGO_SECURE_SSL_REDIRECT", "false").lower() in {
    "1",
    "true",
    "yes",
}
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "0"))

MESSENGER_GATEWAY_URL = os.getenv("MESSENGER_GATEWAY_URL", MESSENGER_GATEWAY_URL).rstrip("/")
MESSENGER_GATEWAY_SECRET = os.getenv("MESSENGER_GATEWAY_SECRET", MESSENGER_GATEWAY_SECRET)
TELEGRAM_API_ID = int(os.getenv("TELEGRAM_API_ID", str(TELEGRAM_API_ID)) or 0)
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", TELEGRAM_API_HASH)

ADMIN_ENABLE_BUSINESS_MODELS = False
