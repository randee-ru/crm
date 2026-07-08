"""Базовые настройки Django, общие для всех окружений."""

from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[3]

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "change-me-in-production")
DEBUG = False
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "unfold",
    "rest_framework",
    "rest_framework.authtoken",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "core.apps.CoreConfig",
    "accounts.apps.AccountsConfig",
    "companies.apps.CompaniesConfig",
    "branches.apps.BranchesConfig",
    "employees.apps.EmployeesConfig",
    "clients.apps.ClientsConfig",
    "contracts.apps.ContractsConfig",
    "crm.apps.CrmConfig",
    "sales.apps.SalesConfig",
    "payments.apps.PaymentsConfig",
    "memberships.apps.MembershipsConfig",
    "schedule.apps.ScheduleConfig",
    "bookings.apps.BookingsConfig",
    "attendance.apps.AttendanceConfig",
    "messaging.apps.MessagingConfig",
    "channels.apps.ChannelsConfig",
    "drive.apps.DriveConfig",
    "mailbox.apps.MailboxConfig",
    "marketing.apps.MarketingConfig",
    "telephony.apps.TelephonyConfig",
    "automation.apps.AutomationConfig",
    "notifications.apps.NotificationsConfig",
    "reports.apps.ReportsConfig",
    "integrations.apps.IntegrationsConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "crm_kit"),
        "USER": os.getenv("POSTGRES_USER", "crm_kit"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "crm_kit"),
        "HOST": os.getenv("POSTGRES_HOST", "127.0.0.1"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

TELEPHONY_RECORDING_RETENTION_DAYS = int(os.getenv("TELEPHONY_RECORDING_RETENTION_DAYS", "365"))
TELEPHONY_RECORDING_ARCHIVE_LIMIT = int(os.getenv("TELEPHONY_RECORDING_ARCHIVE_LIMIT", "25"))
TELEPHONY_AUTO_ARCHIVE_RECORDINGS = os.getenv("TELEPHONY_AUTO_ARCHIVE_RECORDINGS", "true").lower() in {
    "1",
    "true",
    "yes",
}
TELEPHONY_SYNC_LOOKBACK_DAYS = int(os.getenv("TELEPHONY_SYNC_LOOKBACK_DAYS", "2"))
TELEPHONY_RECORDING_ARCHIVE_DELAY_SECONDS = float(os.getenv("TELEPHONY_RECORDING_ARCHIVE_DELAY_SECONDS", "0.3"))

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = os.getenv("DJANGO_SESSION_COOKIE_SECURE", "false").lower() in {"1", "true", "yes"}
CSRF_COOKIE_SECURE = os.getenv("DJANGO_CSRF_COOKIE_SECURE", "false").lower() in {"1", "true", "yes"}
SECURE_SSL_REDIRECT = os.getenv("DJANGO_SECURE_SSL_REDIRECT", "false").lower() in {"1", "true", "yes"}
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", "false").lower() in {
    "1",
    "true",
    "yes",
}
SECURE_HSTS_PRELOAD = os.getenv("DJANGO_SECURE_HSTS_PRELOAD", "false").lower() in {"1", "true", "yes"}

# Операционные CRM-модели в /admin/ только для dev-отладки.
# В production сотрудники работают через frontend + REST API.
ADMIN_ENABLE_BUSINESS_MODELS = False

MESSENGER_GATEWAY_URL = os.getenv("MESSENGER_GATEWAY_URL", "http://127.0.0.1:8787").rstrip("/")
MESSENGER_GATEWAY_SECRET = os.getenv("MESSENGER_GATEWAY_SECRET", "dev-gateway-secret")
TELEGRAM_API_ID = int(os.getenv("TELEGRAM_API_ID", "0") or 0)
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", "")

# Бот для push-уведомлений владельцу системы (новые записи, сообщения, лиды, ошибки).
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_NOTIFY_CHAT_ID = os.getenv("TELEGRAM_NOTIFY_CHAT_ID", "")

# SMS.ru: api_id из личного кабинета. Без имени отправителя — стандартный SMS.ru (без ежемесячной платы).
SMS_RU_API_ID = os.getenv("SMS_RU_API_ID", "").strip()

# Хосты публичного расписания. Через них embed-token не требуется.
PUBLIC_SCHEDULE_HOSTS = [
    host.strip().lower()
    for host in os.getenv("PUBLIC_SCHEDULE_HOSTS", "schedule.sportmax.fit").split(",")
    if host.strip()
]

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "telegram_errors": {
            "level": "ERROR",
            "class": "notifications.logging_handlers.TelegramErrorHandler",
        },
    },
    # Ловим ERROR+ из любого логгера проекта (django.request, наши app-логгеры и т.д.)
    # одним root-хендлером, чтобы не дублировать сообщения в Telegram.
    "root": {
        "handlers": ["telegram_errors"],
        "level": "ERROR",
    },
}

from config.unfold import get_unfold_settings  # noqa: E402

UNFOLD = get_unfold_settings()
