from __future__ import annotations

from rest_framework import serializers

from messaging.models import ChatMessage, ChatRoom


class ChatMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_initials = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "body",
            "author_name",
            "author_initials",
            "created_at",
        ]

    def get_author_name(self, message: ChatMessage) -> str:
        if not message.author_id:
            return "Система"
        full_name = message.author.get_full_name().strip()
        return full_name or message.author.username

    def get_author_initials(self, message: ChatMessage) -> str:
        if not message.author_id:
            return "S"
        full_name = message.author.get_full_name().strip()
        if full_name:
            parts = full_name.split()
            if len(parts) >= 2:
                return f"{parts[0][0]}{parts[1][0]}".upper()
            return parts[0][:2].upper()
        return message.author.username[:2].upper()


class ChatMessageWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["body"]

    def validate_body(self, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Сообщение не может быть пустым.")
        return trimmed

    def create(self, validated_data: dict) -> ChatMessage:
        room = self.context["room"]
        message = ChatMessage.objects.create(
            room=room,
            author=self.context["request"].user,
            body=validated_data["body"],
        )
        room.last_message_at = message.created_at
        room.save(update_fields=["last_message_at", "updated_at"])
        return message


class ChatRoomSerializer(serializers.ModelSerializer):
    last_message_preview = serializers.SerializerMethodField()
    last_message_author = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "title",
            "slug",
            "room_type",
            "last_message_at",
            "last_message_preview",
            "last_message_author",
        ]

    def get_last_message_preview(self, room: ChatRoom) -> str | None:
        message = room.messages.order_by("-created_at", "-id").first()
        if not message:
            return None
        body = message.body.strip()
        return body if len(body) <= 120 else f"{body[:117]}..."

    def get_last_message_author(self, room: ChatRoom) -> str | None:
        message = room.messages.select_related("author").order_by("-created_at", "-id").first()
        if not message or not message.author_id:
            return None
        full_name = message.author.get_full_name().strip()
        return full_name or message.author.username
