from __future__ import annotations

from unfold.admin import ModelAdmin

from .models import Sale


class SaleAdmin(ModelAdmin):
    list_display = ("title", "company", "client", "status", "total_amount", "paid_amount", "balance_due")
    list_filter = ("company", "branch", "status")
    search_fields = ("title", "client__first_name", "client__last_name", "membership__title")
    autocomplete_fields = ("company", "branch", "trainer")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True
