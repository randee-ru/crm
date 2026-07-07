from __future__ import annotations

from django.apps import AppConfig


class ScheduleConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "schedule"
    verbose_name = "Schedule"

    def ready(self) -> None:
        from config.admin_registry import register_business_admin

        from .admin import ScheduleEventAdmin
        from .models import ScheduleEvent

        register_business_admin(ScheduleEvent, ScheduleEventAdmin)
