from __future__ import annotations

from rest_framework import serializers

from channels.choices import MessengerProvider
from channels.models import MessengerAccount, MessengerIntegration, MessengerMessage, MessengerThread
from channels.webhook_urls import build_max_webhook_url


class MessengerIntegrationSerializer(serializers.ModelSerializer):
    webhook_url = serializers.SerializerMethodField()
    has_token = serializers.SerializerMethodField()
    has_connected_account = serializers.SerializerMethodField()

    class Meta:
        model = MessengerIntegration
        fields = [
            "id",
            "provider",
            "is_active",
            "connection_mode",
            "has_token",
            "has_connected_account",
            "webhook_url",
            "settings",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_webhook_url(self, obj: MessengerIntegration) -> str:
        if obj.provider == "max":
            return build_max_webhook_url(obj)
        return ""

    def get_has_token(self, obj: MessengerIntegration) -> bool:
        return bool(obj.bot_token)

    def get_has_connected_account(self, obj: MessengerIntegration) -> bool:
        return MessengerAccount.objects.filter(
            company_id=obj.company_id,
            provider=obj.provider,
            status=MessengerAccount.Status.READY,
            is_active=True,
        ).exists()


class MessengerIntegrationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessengerIntegration
        fields = ["bot_token", "webhook_secret", "is_active", "settings", "connection_mode"]

    def validate_bot_token(self, value: str) -> str:
        return value.strip()

    def validate_webhook_secret(self, value: str) -> str:
        return value.strip()


class MessengerAccountSerializer(serializers.ModelSerializer):
    qr_data_url = serializers.SerializerMethodField()

    class Meta:
        model = MessengerAccount
        fields = [
            "id",
            "provider",
            "gateway_session_id",
            "label",
            "phone",
            "status",
            "error_message",
            "qr_data_url",
            "is_active",
            "connected_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_qr_data_url(self, obj: MessengerAccount) -> str:
        settings = obj.settings if isinstance(obj.settings, dict) else {}
        return str(settings.get("qr_data_url") or "")


class MessengerAccountWriteSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=MessengerProvider.choices)
    label = serializers.CharField(required=False, allow_blank=True, max_length=120)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=32)


class MessengerTelegramCodeSerializer(serializers.Serializer):
    code = serializers.CharField()

    def validate_code(self, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Введите код из Telegram.")
        return trimmed


class MessengerTelegramPasswordSerializer(serializers.Serializer):
    password = serializers.CharField()

    def validate_password(self, value: str) -> str:
        if not value:
            raise serializers.ValidationError("Введите пароль 2FA.")
        return value


class MessengerGatewayCodeSerializer(serializers.Serializer):
    code = serializers.CharField()

    def validate_code(self, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Введите код из SMS.")
        return trimmed


class MessengerGatewayPasswordSerializer(serializers.Serializer):
    password = serializers.CharField()

    def validate_password(self, value: str) -> str:
        if not value:
            raise serializers.ValidationError("Введите пароль 2FA.")
        return value


class MessengerThreadSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = MessengerThread
        fields = [
            "id",
            "provider",
            "external_chat_id",
            "contact_name",
            "contact_phone",
            "client",
            "client_name",
            "last_message_at",
            "last_message_preview",
            "unread_count",
        ]

    def get_client_name(self, obj: MessengerThread) -> str | None:
        if obj.client_id and obj.client:
            return obj.client.full_name
        return None


class MessengerMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = MessengerMessage
        fields = [
            "id",
            "direction",
            "body",
            "sent_at",
            "external_id",
            "author_name",
        ]

    def get_author_name(self, obj: MessengerMessage) -> str:
        if obj.author_user:
            return obj.author_user.get_full_name() or obj.author_user.username
        if obj.direction == "inbound":
            return obj.thread.contact_name or "Клиент"
        return "Оператор"


class MessengerMessageWriteSerializer(serializers.Serializer):
    body = serializers.CharField()

    def validate_body(self, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Введите текст сообщения.")
        return trimmed
