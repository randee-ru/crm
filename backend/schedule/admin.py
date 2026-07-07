from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import ScheduleEvent


class ScheduleEventAdmin(ModelAdmin):
    # Dev-only: расписание ведётся в CRM frontend.
    list_display = ("title", "company", "starts_at", "ends_at", "trainer", "trainer_name", "room", "status")
    list_filter = ("company", "status", "branch")
    search_fields = ("title", "trainer_name", "trainer__first_name", "trainer__last_name", "room")
    autocomplete_fields = ("company", "branch", "client", "trainer")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True
