from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import CompanyMembership, EmployeeInvitation


@admin.register(CompanyMembership)
class CompanyMembershipAdmin(ModelAdmin):
    # Кто из пользователей имеет доступ к какой компании и с какой ролью.
    list_display = ("user", "company", "branch", "role", "is_active", "created_at")
    list_filter = ("company", "branch", "role", "is_active")
    search_fields = ("user__username", "user__email", "company__name")
    autocomplete_fields = ("user", "company", "branch")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True


@admin.register(EmployeeInvitation)
class EmployeeInvitationAdmin(ModelAdmin):
    list_display = ("email", "company", "branch", "role", "status", "invited_by", "created_at")
    list_filter = ("company", "branch", "role", "status")
    search_fields = ("email", "full_name", "company__name")
    autocomplete_fields = ("company", "branch", "invited_by")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True
