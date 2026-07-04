from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Branch


@admin.register(Branch)
class BranchAdmin(ModelAdmin):
    # Показываем компанию рядом с филиалом, чтобы сотрудник сразу видел контекст.
    list_display = ("name", "company", "slug", "is_primary", "is_active", "city")
    list_filter = ("company", "is_primary", "is_active", "city")
    search_fields = ("name", "slug", "company__name")
    autocomplete_fields = ("company",)
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True
