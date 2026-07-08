"""Конфигурация URL проекта.

Корневой роутер специально остаётся маленьким.
Бизнес-модули позже зарегистрируют свои URL отдельно.
"""

from __future__ import annotations

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from channels.webhooks import MaxWebhookView, TelegramWebhookView, WhatsAppWebhookView
from telephony.webhooks import MangoWebhookView

from . import admin as admin_config  # noqa: F401
from . import platform_auth_admin as platform_auth_admin_config  # noqa: F401


def healthcheck(_: object) -> JsonResponse:
    """Простой healthcheck-эндпоинт для балансировщиков и локальной проверки."""
    return JsonResponse({"status": "ok", "service": "crm-kit"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck),
    path("api/mango/callback", MangoWebhookView.as_view(), name="mango-callback"),
    path("api/channels/webhooks/max", MaxWebhookView.as_view(), name="max-webhook"),
    path("api/channels/webhooks/telegram", TelegramWebhookView.as_view(), name="telegram-webhook"),
    path("api/channels/webhooks/whatsapp", WhatsAppWebhookView.as_view(), name="whatsapp-webhook"),
    path("api/v1/", include("accounts.urls")),
    path("api/v1/", include("companies.urls")),
    path("api/v1/", include("employees.urls")),
    path("api/v1/", include("clients.urls")),
    path("api/v1/", include("memberships.urls")),
    path("api/v1/", include("contracts.urls")),
    path("api/v1/", include("bookings.urls")),
    path("api/v1/", include("attendance.urls")),
    path("api/v1/", include("messaging.urls")),
    path("api/v1/", include("channels.urls")),
    path("api/v1/channels/webhooks/max/", MaxWebhookView.as_view(), name="max-webhook-v1"),
    path("api/v1/channels/webhooks/telegram/", TelegramWebhookView.as_view(), name="telegram-webhook-v1"),
    path("api/v1/channels/webhooks/whatsapp/", WhatsAppWebhookView.as_view(), name="whatsapp-webhook-v1"),
    path("api/v1/", include("drive.urls")),
    path("api/v1/", include("mailbox.urls")),
    path("api/v1/", include("marketing.urls")),
    path("api/v1/", include("telephony.urls")),
    path("api/v1/", include("sales.urls")),
    path("api/v1/", include("payments.urls")),
    path("api/v1/", include("crm.urls")),
    path("api/v1/", include("schedule.urls")),
    path("api/v1/", include("notifications.urls")),
    path("api/v1/", include("automation.urls")),
    path("api/v1/", include("reports.urls")),
    path("api/v1/", include("integrations.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
