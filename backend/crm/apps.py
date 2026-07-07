from __future__ import annotations

from django.apps import AppConfig


class CrmConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "crm"
    verbose_name = "CRM"

    def ready(self) -> None:
        from config.admin_registry import register_business_admin

        from .admin import DealAdmin, DealPipelineAdmin, DealStageAdmin, TaskAdmin
        from .models import Deal, DealPipeline, DealStage, Task

        register_business_admin(Task, TaskAdmin)
        register_business_admin(DealPipeline, DealPipelineAdmin)
        register_business_admin(DealStage, DealStageAdmin)
        register_business_admin(Deal, DealAdmin)
