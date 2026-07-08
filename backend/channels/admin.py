from __future__ import annotations

from django.contrib import admin

from channels.models import MessengerAccount, MessengerIntegration, MessengerMessage, MessengerThread


@admin.register(MessengerAccount)
class MessengerAccountAdmin(admin.ModelAdmin):
    list_display = ("label", "provider", "company", "status", "phone", "connected_at")
    list_filter = ("provider", "status", "is_active")
    search_fields = ("label", "phone", "gateway_session_id", "company__slug")


@admin.register(MessengerIntegration)
class MessengerIntegrationAdmin(admin.ModelAdmin):
    list_display = ("company", "provider", "is_active", "updated_at")
    list_filter = ("provider", "is_active")
    search_fields = ("company__name", "company__slug")


@admin.register(MessengerThread)
class MessengerThreadAdmin(admin.ModelAdmin):
    list_display = ("contact_name", "provider", "company", "last_message_at", "unread_count")
    list_filter = ("provider",)
    search_fields = ("contact_name", "contact_phone", "external_chat_id")


@admin.register(MessengerMessage)
class MessengerMessageAdmin(admin.ModelAdmin):
    list_display = ("thread", "direction", "sent_at", "body")
    list_filter = ("direction",)
