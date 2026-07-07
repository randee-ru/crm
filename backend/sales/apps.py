from __future__ import annotations

from django.apps import AppConfig


class SalesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "sales"
    verbose_name = "Продажи"

    def ready(self) -> None:
        from config.admin_registry import register_business_admin

        from .admin import SaleAdmin
        from .models import Sale

        register_business_admin(Sale, SaleAdmin)
