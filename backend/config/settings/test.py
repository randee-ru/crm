"""Тестовые настройки.

Тесты должны запускаться с минимальным количеством внешней настройки.
Здесь достаточно SQLite, потому что текущие тесты проверяют только путь запуска приложения и health endpoint.
"""

from __future__ import annotations

from .base import *  # noqa: F401,F403

DEBUG = False

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test.sqlite3",
    }
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Тестам не нужен боевой Telegram-логгер, а его импорт тянет лишние зависимости.
LOGGING_CONFIG = None
