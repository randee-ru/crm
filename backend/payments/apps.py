from __future__ import annotations

from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "payments"
    verbose_name = "Платежи"

    def ready(self) -> None:
        from config.admin_registry import register_business_admin

        from .admin import PaymentAdmin
        from .models import Payment

        register_business_admin(Payment, PaymentAdmin)
