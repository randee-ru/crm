"""Условная регистрация бизнес-моделей в Django admin.

Операционные CRM-сущности не должны быть основным интерфейсом /admin/.
Их подключаем только когда ADMIN_ENABLE_BUSINESS_MODELS=True (dev-отладка).
"""

from __future__ import annotations

from django.conf import settings
from django.contrib import admin


def register_business_admin(
    model: type,
    admin_class: type[admin.ModelAdmin],
) -> None:
    if not getattr(settings, "ADMIN_ENABLE_BUSINESS_MODELS", False):
        return
    if model in admin.site._registry:
        return
    admin.site.register(model, admin_class)
