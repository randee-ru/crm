"""Настройки для разработки."""

from __future__ import annotations

import os
from pathlib import Path

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


_load_dotenv(BASE_DIR / "backend" / ".env")
_load_dotenv(BASE_DIR / ".env")

DEBUG = True
_hosts = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0").split(",")
ALLOWED_HOSTS = [host.strip() for host in _hosts if host.strip()]

_public_app_url = os.getenv("PUBLIC_APP_URL", "").strip()
if _public_app_url:
    try:
        from urllib.parse import urlparse

        _ngrok_host = urlparse(_public_app_url).hostname
        if _ngrok_host and _ngrok_host not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(_ngrok_host)
    except Exception:
        pass

# В dev можно смотреть CRM-данные в /admin/ для отладки.
ADMIN_ENABLE_BUSINESS_MODELS = True

MIDDLEWARE = [
    "config.middleware.dev_cors.DevCorsMiddleware",
    *MIDDLEWARE,
]
