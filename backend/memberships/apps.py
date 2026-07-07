from __future__ import annotations

from django.apps import AppConfig


class MembershipsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "memberships"
    verbose_name = "Абонементы"

    def ready(self) -> None:
        from config.admin_registry import register_business_admin

        from .admin import MembershipAdmin
        from .models import Membership

        register_business_admin(Membership, MembershipAdmin)