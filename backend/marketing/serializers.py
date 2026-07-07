from __future__ import annotations

from rest_framework import serializers

from marketing.models import MarketingCampaign, MarketingIntegration


class MarketingIntegrationSerializer(serializers.ModelSerializer):
    provider_label = serializers.CharField(source="get_provider_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    connected_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MarketingIntegration
        fields = [
            "id",
            "provider",
            "provider_label",
            "title",
            "status",
            "status_label",
            "settings",
            "is_active",
            "connected_by_name",
            "last_synced_at",
            "created_at",
            "updated_at",
        ]

    def get_connected_by_name(self, integration: MarketingIntegration) -> str | None:
        if not integration.connected_by_id:
            return None
        full_name = integration.connected_by.get_full_name().strip()
        return full_name or integration.connected_by.username


class MarketingIntegrationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketingIntegration
        fields = ["provider", "title", "status", "settings", "is_active"]

    def validate_settings(self, value: dict) -> dict:
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Настройки должны быть объектом.")
        return value

    def create(self, validated_data: dict) -> MarketingIntegration:
        company = self.context["company"]
        user = self.context["request"].user
        provider = validated_data["provider"]
        integration, _created = MarketingIntegration.objects.update_or_create(
            company=company,
            provider=provider,
            defaults={
                **validated_data,
                "connected_by": user,
                "status": validated_data.get("status", MarketingIntegration.Status.CONNECTED),
            },
        )
        return integration


class MarketingCampaignSerializer(serializers.ModelSerializer):
    channel_label = serializers.CharField(source="get_channel_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MarketingCampaign
        fields = [
            "id",
            "channel",
            "channel_label",
            "title",
            "subject",
            "body",
            "status",
            "status_label",
            "recipients_count",
            "scheduled_at",
            "sent_at",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, campaign: MarketingCampaign) -> str | None:
        if not campaign.created_by_id:
            return None
        full_name = campaign.created_by.get_full_name().strip()
        return full_name or campaign.created_by.username


class MarketingCampaignWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketingCampaign
        fields = [
            "channel",
            "title",
            "subject",
            "body",
            "status",
            "recipients_count",
            "scheduled_at",
        ]

    def validate_title(self, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Укажите название кампании.")
        return trimmed

    def create(self, validated_data: dict) -> MarketingCampaign:
        return MarketingCampaign.objects.create(
            company=self.context["company"],
            created_by=self.context["request"].user,
            **validated_data,
        )
