from __future__ import annotations

from unfold.admin import ModelAdmin

from .models import Payment


class PaymentAdmin(ModelAdmin):
    list_display = ("amount", "company", "client", "status", "method", "paid_at")
    list_filter = ("company", "branch", "status", "method")
    search_fields = ("client__first_name", "client__last_name", "sale__title", "external_id")
    autocomplete_fields = ("company", "branch", "sale")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True
