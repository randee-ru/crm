from __future__ import annotations

from django.apps import AppConfig


class EmployeesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "employees"
    verbose_name = "Тренеры"

    def ready(self) -> None:
        from config.admin_registry import register_business_admin

        from .admin import TrainerAdmin
        from .models import Trainer

        register_business_admin(Trainer, TrainerAdmin)
