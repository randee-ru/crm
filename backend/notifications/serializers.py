from __future__ import annotations

from rest_framework import serializers

from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "kind",
            "title",
            "body",
            "target_url",
            "is_read",
            "read_at",
            "source_app",
            "source_model",
            "source_object_id",
            "payload",
            "created_at",
        ]
        read_only_fields = fields


class NotificationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["is_read"]


class NotificationMarkReadSerializer(serializers.Serializer):
    is_read = serializers.BooleanField(default=True)
