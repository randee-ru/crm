from __future__ import annotations

from django.urls import path

from channels.gateway_views import (
    MessengerGatewayAccountDetailView,
    MessengerGatewayAccountListCreateView,
    MessengerGatewayInboundView,
    MessengerGatewayMaxCodeView,
    MessengerGatewayMaxPasswordView,
    MessengerGatewayTelegramCodeView,
    MessengerGatewayTelegramPasswordView,
)
from channels.views import (
    MessengerIntegrationView,
    MessengerMessageListCreateView,
    MessengerThreadListView,
    MessengerThreadReadView,
)

urlpatterns = [
    path("channels/integrations/", MessengerIntegrationView.as_view(), name="messenger-integrations"),
    path("channels/gateway/accounts/", MessengerGatewayAccountListCreateView.as_view(), name="messenger-gateway-accounts"),
    path(
        "channels/gateway/accounts/<int:account_id>/",
        MessengerGatewayAccountDetailView.as_view(),
        name="messenger-gateway-account-detail",
    ),
    path(
        "channels/gateway/accounts/<int:account_id>/telegram-code/",
        MessengerGatewayTelegramCodeView.as_view(),
        name="messenger-gateway-telegram-code",
    ),
    path(
        "channels/gateway/accounts/<int:account_id>/telegram-password/",
        MessengerGatewayTelegramPasswordView.as_view(),
        name="messenger-gateway-telegram-password",
    ),
    path(
        "channels/gateway/accounts/<int:account_id>/max-code/",
        MessengerGatewayMaxCodeView.as_view(),
        name="messenger-gateway-max-code",
    ),
    path(
        "channels/gateway/accounts/<int:account_id>/max-password/",
        MessengerGatewayMaxPasswordView.as_view(),
        name="messenger-gateway-max-password",
    ),
    path("channels/gateway/inbound/", MessengerGatewayInboundView.as_view(), name="messenger-gateway-inbound"),
    path("channels/threads/", MessengerThreadListView.as_view(), name="messenger-threads"),
    path(
        "channels/threads/<int:thread_id>/messages/",
        MessengerMessageListCreateView.as_view(),
        name="messenger-thread-messages",
    ),
    path(
        "channels/threads/<int:thread_id>/read/",
        MessengerThreadReadView.as_view(),
        name="messenger-thread-read",
    ),
]
