from __future__ import annotations

from rest_framework import serializers

from mailbox.models import MailAccount, MailMessage


class MailAccountSerializer(serializers.ModelSerializer):
    provider_label = serializers.CharField(source="get_provider_display", read_only=True)
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = MailAccount
        fields = [
            "id",
            "provider",
            "provider_label",
            "email",
            "display_name",
            "is_active",
            "unread_count",
            "created_at",
        ]

    def get_unread_count(self, account: MailAccount) -> int:
        return account.messages.filter(folder=MailMessage.Folder.INBOX, is_read=False).count()


class MailAccountWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MailAccount
        fields = ["provider", "email", "display_name"]

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    def create(self, validated_data: dict) -> MailAccount:
        return MailAccount.objects.create(
            company=self.context["company"],
            user=self.context["request"].user,
            **validated_data,
        )


class MailMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MailMessage
        fields = [
            "id",
            "folder",
            "subject",
            "body",
            "from_name",
            "from_email",
            "to_emails",
            "is_read",
            "sent_at",
            "created_at",
        ]


class MailMessageWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MailMessage
        fields = ["subject", "body", "to_emails"]

    def validate_subject(self, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Укажите тему письма.")
        return trimmed

    def validate_body(self, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Текст письма не может быть пустым.")
        return trimmed

    def create(self, validated_data: dict) -> MailMessage:
        from django.utils import timezone

        account = self.context["account"]
        user = self.context["request"].user
        display_name = user.get_full_name().strip() or user.username
        return MailMessage.objects.create(
            account=account,
            folder=MailMessage.Folder.SENT,
            from_name=display_name,
            from_email=account.email,
            sent_at=timezone.now(),
            is_read=True,
            **validated_data,
        )
