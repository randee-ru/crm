from __future__ import annotations

from unfold.admin import ModelAdmin

from marketing.models import MarketingCampaign, MarketingIntegration


class MarketingIntegrationAdmin(ModelAdmin):
    list_display = ("provider", "company", "status", "is_active", "updated_at")
    list_filter = ("provider", "status", "is_active")
    search_fields = ("title", "company__name")


class MarketingCampaignAdmin(ModelAdmin):
    list_display = ("title", "channel", "status", "company", "recipients_count", "created_at")
    list_filter = ("channel", "status")
    search_fields = ("title", "subject", "company__name")
