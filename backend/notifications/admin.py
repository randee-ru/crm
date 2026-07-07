from __future__ import annotations

from django.contrib import admin

from notifications.models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "company", "recipient", "kind", "is_read", "created_at")
    list_filter = ("company", "kind", "is_read", "created_at")
    search_fields = ("title", "body", "source_app", "source_model", "source_object_id")
