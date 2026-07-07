from unfold.admin import ModelAdmin

from telephony.models import CallLog, TelephonyIntegration


class TelephonyIntegrationAdmin(ModelAdmin):
    list_display = ("company", "provider", "is_active", "last_synced_at")
    search_fields = ("company__name", "company__slug")


class CallLogAdmin(ModelAdmin):
    list_display = ("caller_phone", "line_name", "client", "direction", "status", "started_at", "duration")
    list_filter = ("direction", "status", "company")
    search_fields = ("caller_phone", "target_phone", "line_name", "client__last_name")
    raw_id_fields = ("client", "company")
