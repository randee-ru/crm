"""Auth-модели в админке платформы с оформлением Unfold."""

from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group, User
from rest_framework.authtoken.models import TokenProxy
from unfold.admin import ModelAdmin
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm


admin.site.unregister(User)
admin.site.unregister(Group)

try:
    admin.site.unregister(TokenProxy)
except admin.sites.NotRegistered:
    pass


@admin.register(User)
class PlatformUserAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm
    list_fullwidth = True
    compressed_fields = True


@admin.register(Group)
class PlatformGroupAdmin(BaseGroupAdmin, ModelAdmin):
    list_fullwidth = True
    compressed_fields = True


@admin.register(TokenProxy)
class ApiTokenAdmin(ModelAdmin):
    list_display = ("key", "user", "created")
    search_fields = ("user__username", "user__email", "key")
    autocomplete_fields = ("user",)
    list_fullwidth = True
    compressed_fields = True
