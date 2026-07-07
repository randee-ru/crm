from __future__ import annotations

from unfold.admin import ModelAdmin

from .models import Client, ClientLead, ClientMessage


class ClientMessageAdmin(ModelAdmin):
    list_display = ("client", "channel", "message_type", "sent_at", "company")
    search_fields = ("client__first_name", "client__last_name", "body", "phone")


class ClientLeadAdmin(ModelAdmin):
    list_display = ("client", "title", "status", "lead_date", "company")
    search_fields = ("client__first_name", "client__last_name", "title")


class ClientAdmin(ModelAdmin):
    # Dev-only: операционные клиенты управляются через CRM frontend.
    list_display = (
        "full_name",
        "phone",
        "client_status",
        "company",
        "branch",
        "is_active",
        "club_access_blocked",
        "group_programs_blocked",
        "created_at",
    )
    list_filter = ("company", "branch", "is_active", "club_access_blocked", "group_programs_blocked")
    search_fields = ("first_name", "last_name", "phone", "email")
    autocomplete_fields = ("company", "branch")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True
