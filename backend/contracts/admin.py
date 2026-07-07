from __future__ import annotations

from unfold.admin import ModelAdmin

from contracts.models import Contract


class ContractAdmin(ModelAdmin):
    list_display = ("number", "client", "contract_date", "is_signed", "company", "branch")
    list_filter = ("is_signed", "contract_date")
    search_fields = ("number", "client__first_name", "client__last_name", "template_name")
