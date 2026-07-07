from __future__ import annotations

from django.apps import AppConfig


class AutomationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "automation"
    verbose_name = "Automation"

    def ready(self) -> None:
        from automation import signals  # noqa: F401
