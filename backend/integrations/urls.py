from __future__ import annotations

from django.urls import path

from integrations.views import (
    IntegrationConnectionDetailView,
    IntegrationConnectionListCreateView,
    IntegrationEventListView,
    IntegrationWebhookView,
)


urlpatterns = [
    path("integrations/", IntegrationConnectionListCreateView.as_view(), name="integration-list"),
    path("integrations/<int:connection_id>/", IntegrationConnectionDetailView.as_view(), name="integration-detail"),
    path("integrations/events/", IntegrationEventListView.as_view(), name="integration-event-list"),
    path("integrations/webhooks/<str:provider>/", IntegrationWebhookView.as_view(), name="integration-webhook"),
]
