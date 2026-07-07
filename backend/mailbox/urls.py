from __future__ import annotations

from django.urls import path

from mailbox.views import MailAccountListCreateView, MailMessageDetailView, MailMessageListCreateView

urlpatterns = [
    path("mail/accounts/", MailAccountListCreateView.as_view(), name="mail-account-list"),
    path("mail/accounts/<int:account_id>/messages/", MailMessageListCreateView.as_view(), name="mail-message-list"),
    path(
        "mail/accounts/<int:account_id>/messages/<int:message_id>/",
        MailMessageDetailView.as_view(),
        name="mail-message-detail",
    ),
]
