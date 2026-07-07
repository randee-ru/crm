from __future__ import annotations

from django.urls import path

from marketing.views import (
    MarketingCampaignDetailView,
    MarketingCampaignListCreateView,
    MarketingIntegrationDetailView,
    MarketingIntegrationListCreateView,
)

urlpatterns = [
    path(
        "marketing/integrations/",
        MarketingIntegrationListCreateView.as_view(),
        name="marketing-integration-list",
    ),
    path(
        "marketing/integrations/<int:integration_id>/",
        MarketingIntegrationDetailView.as_view(),
        name="marketing-integration-detail",
    ),
    path(
        "marketing/campaigns/",
        MarketingCampaignListCreateView.as_view(),
        name="marketing-campaign-list",
    ),
    path(
        "marketing/campaigns/<int:campaign_id>/",
        MarketingCampaignDetailView.as_view(),
        name="marketing-campaign-detail",
    ),
]
