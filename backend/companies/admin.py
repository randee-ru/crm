from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Company


@admin.register(Company)
class CompanyAdmin(ModelAdmin):
    # Делаем список компактным и удобным для внутренних сотрудников.
    list_display = ("name", "slug", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True
