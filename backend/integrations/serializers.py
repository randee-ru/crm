from __future__ import annotations

from rest_framework import serializers

from integrations.models import IntegrationConnection, IntegrationEvent


class IntegrationConnectionSerializer(serializers.ModelSerializer):
    provider_label = serializers.CharField(source="get_provider_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    # Явно ослабляем автогенерируемый DRF-валидатор UniqueConstraint: он требует
    # обязательного заполнения всех полей составного ограничения, хотя external_id
    # у модели blank=True и ограничение всё равно условное (только для непустых значений).
    external_id = serializers.CharField(required=False, allow_blank=True, max_length=120)

    class Meta:
        model = IntegrationConnection
        fields = [
            "id",
            "company",
            "provider",
            "provider_label",
            "name",
            "status",
            "status_label",
            "external_id",
            "config",
            "last_synced_at",
            "last_error",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["company", "last_synced_at", "last_error", "created_at", "updated_at"]


class IntegrationEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationEvent
        fields = [
            "id",
            "company",
            "connection",
            "provider",
            "direction",
            "event_type",
            "status",
            "payload",
            "external_key",
            "received_at",
            "processed_at",
            "error",
            "created_at",
        ]
        read_only_fields = fields
