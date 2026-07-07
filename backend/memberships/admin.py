from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Membership


class MembershipAdmin(ModelAdmin):
    # Dev-only: абонементы будут вестись в CRM frontend.
    list_display = (
        "title",
        "client",
        "company",
        "branch",
        "status",
        "starts_at",
        "ends_at",
        "visits_used",
    )
    list_filter = ("company", "branch", "status", "starts_at", "ends_at")
    search_fields = ("title", "client__first_name", "client__last_name", "client__phone")
    autocomplete_fields = ("company", "branch", "client")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True
