"""Конфигурация URL проекта.

Корневой роутер специально остаётся маленьким.
Бизнес-модули позже зарегистрируют свои URL отдельно.
"""

from __future__ import annotations

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path


def healthcheck(_: object) -> JsonResponse:
    """Простой healthcheck-эндпоинт для балансировщиков и локальной проверки."""
    return JsonResponse({"status": "ok", "service": "crm-kit"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck),
]
