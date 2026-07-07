from __future__ import annotations

from unfold.admin import ModelAdmin

from .models import AttendanceRecord


class AttendanceRecordAdmin(ModelAdmin):
    list_display = ("client", "company", "branch", "status", "checked_in_at", "trainer")
    list_filter = ("company", "branch", "status")
    search_fields = ("client__first_name", "client__last_name", "trainer__first_name", "trainer__last_name")
    autocomplete_fields = ("company", "branch", "trainer", "booking")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True
