from __future__ import annotations

from rest_framework import serializers

from automation.models import AutomationEvent, AutomationRule


class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = [
            "id",
            "company",
            "name",
            "event_type",
            "is_active",
            "sort_order",
            "conditions",
            "actions",
            "last_run_at",
            "last_error",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["company", "last_run_at", "last_error", "created_at", "updated_at"]


class AutomationEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationEvent
        fields = [
            "id",
            "company",
            "event_type",
            "status",
            "actor",
            "source_app",
            "source_model",
            "source_object_id",
            "payload",
            "processed_at",
            "error",
            "created_at",
        ]
        read_only_fields = fields
