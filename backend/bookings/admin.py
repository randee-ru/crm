from __future__ import annotations

from unfold.admin import ModelAdmin

from .models import Booking


class BookingAdmin(ModelAdmin):
    list_display = ("title", "company", "starts_at", "ends_at", "client", "trainer", "status")
    list_filter = ("company", "branch", "status", "starts_at")
    search_fields = ("title", "client__first_name", "client__last_name", "trainer__first_name", "trainer__last_name")
    autocomplete_fields = ("company", "branch", "trainer")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True
