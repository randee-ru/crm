from __future__ import annotations

from django.contrib import admin

from automation.models import AutomationEvent, AutomationRule


@admin.register(AutomationRule)
class AutomationRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "event_type", "is_active", "sort_order", "last_run_at")
    list_filter = ("company", "event_type", "is_active")
    search_fields = ("name", "event_type")


@admin.register(AutomationEvent)
class AutomationEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "company", "status", "actor", "created_at", "processed_at")
    list_filter = ("company", "event_type", "status")
    search_fields = ("event_type", "source_app", "source_model", "source_object_id")
