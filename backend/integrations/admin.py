from __future__ import annotations

from django.contrib import admin

from integrations.models import IntegrationConnection, IntegrationEvent


class IntegrationConnectionAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "provider", "status", "last_synced_at")
    list_filter = ("company", "provider", "status")
    search_fields = ("name", "external_id")


class IntegrationEventAdmin(admin.ModelAdmin):
    list_display = ("provider", "event_type", "company", "status", "created_at")
    list_filter = ("company", "provider", "status", "direction")
    search_fields = ("provider", "event_type", "external_key", "error")
