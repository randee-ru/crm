from __future__ import annotations

from django.apps import AppConfig


class ClientsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "clients"
    verbose_name = "Клиенты"

    def ready(self) -> None:
        from config.admin_registry import register_business_admin

        from .admin import ClientAdmin, ClientLeadAdmin, ClientMessageAdmin
        from .models import Client, ClientLead, ClientMessage

        register_business_admin(Client, ClientAdmin)
        register_business_admin(ClientLead, ClientLeadAdmin)
        register_business_admin(ClientMessage, ClientMessageAdmin)
