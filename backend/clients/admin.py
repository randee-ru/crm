from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Client


@admin.register(Client)
class ClientAdmin(ModelAdmin):
    # Список должен быстро показывать, кто клиент и к какому клубу он относится.
    list_display = ("full_name", "phone", "company", "branch", "is_active", "created_at")
    list_filter = ("company", "branch", "is_active")
    search_fields = ("first_name", "last_name", "phone", "email")
    autocomplete_fields = ("company", "branch")
    list_fullwidth = True
    warn_unsaved_form = True
    compressed_fields = True

