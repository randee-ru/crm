from __future__ import annotations

from rest_framework import serializers

from integrations.models import IntegrationConnection, IntegrationEvent


class IntegrationConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationConnection
        fields = [
            "id",
            "company",
            "provider",
            "name",
            "status",
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
