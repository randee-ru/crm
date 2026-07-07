from __future__ import annotations

from django.urls import path

from messaging.views import ChatMessageListCreateView, ChatRoomListView

urlpatterns = [
    path("chats/", ChatRoomListView.as_view(), name="chat-room-list"),
    path("chats/<int:room_id>/messages/", ChatMessageListCreateView.as_view(), name="chat-message-list"),
]
