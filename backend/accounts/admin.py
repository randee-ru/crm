from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import CompanyMembership


@admin.register(CompanyMembership)
class CompanyMembershipAdmin(ModelAdmin):
    # Даём сотрудникам увидеть, кто и к какой компании имеет доступ.
    list_display = ("user", "company", "branch", "role", "is_active", "created_at")
    list_filter = ("company", "branch", "role", "is_active")
    search_fields = ("user__username", "user__email", "company__name")
    autocomplete_fields = ("user", "company", "branch")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True
