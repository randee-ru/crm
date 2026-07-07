from __future__ import annotations

from django.db.models import Prefetch, QuerySet
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListAPIView, ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from messaging.models import ChatMessage, ChatRoom
from messaging.serializers import (
    ChatMessageSerializer,
    ChatMessageWriteSerializer,
    ChatRoomSerializer,
)


class MessagingQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company(self):
        return get_company_from_request(self.request)

    def get_company_rooms_queryset(self) -> QuerySet[ChatRoom]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return ChatRoom.objects.none()

        messages_qs = ChatMessage.objects.select_related("author").order_by("-created_at", "-id")
        return (
            ChatRoom.objects.filter(company__slug=company_slug, company__is_active=True)
            .prefetch_related(Prefetch("messages", queryset=messages_qs))
            .order_by("-last_message_at", "title")
        )


class ChatRoomListView(MessagingQuerysetMixin, ListAPIView):
    serializer_class = ChatRoomSerializer

    def get_queryset(self) -> QuerySet[ChatRoom]:
        return self.get_company_rooms_queryset()


class ChatMessageListCreateView(MessagingQuerysetMixin, ListCreateAPIView):
    def get_room(self) -> ChatRoom:
        room_id = self.kwargs["room_id"]
        return self.get_company_rooms_queryset().get(id=room_id)

    def get_queryset(self) -> QuerySet[ChatMessage]:
        return self.get_room().messages.select_related("author").order_by("created_at", "id")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ChatMessageWriteSerializer
        return ChatMessageSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["room"] = self.get_room()
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = ChatMessageWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        message = write_serializer.save()
        read_serializer = ChatMessageSerializer(message)
        return Response(read_serializer.data, status=201)
