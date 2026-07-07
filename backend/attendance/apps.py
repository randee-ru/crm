from __future__ import annotations

from django.apps import AppConfig


class AttendanceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "attendance"
    verbose_name = "Посещаемость"

    def ready(self) -> None:
        from config.admin_registry import register_business_admin

        from .admin import AttendanceRecordAdmin
        from .models import AttendanceRecord

        register_business_admin(AttendanceRecord, AttendanceRecordAdmin)
