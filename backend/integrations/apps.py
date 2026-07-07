from __future__ import annotations

from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "integrations"
    verbose_name = "Integrations"

    def ready(self) -> None:
        from config.admin_registry import register_business_admin

        from .admin import IntegrationConnectionAdmin, IntegrationEventAdmin
        from .models import IntegrationConnection, IntegrationEvent

        register_business_admin(IntegrationConnection, IntegrationConnectionAdmin)
        register_business_admin(IntegrationEvent, IntegrationEventAdmin)
