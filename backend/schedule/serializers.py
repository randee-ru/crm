from __future__ import annotations

from rest_framework import serializers

from branches.models import Branch
from clients.models import Client
from employees.models import Trainer
from schedule.models import ScheduleEvent


class ScheduleEventListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True, default=None)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    trainer_name = serializers.SerializerMethodField()

    class Meta:
        model = ScheduleEvent
        fields = [
            "id",
            "title",
            "trainer_name",
            "room",
            "starts_at",
            "ends_at",
            "status",
            "client_name",
            "branch_name",
        ]

    def get_trainer_name(self, event: ScheduleEvent) -> str | None:
        if event.trainer_id:
            return event.trainer.full_name
        return event.trainer_name or None


class ScheduleEventDetailSerializer(ScheduleEventListSerializer):
    notes = serializers.CharField(read_only=True)
    client_id = serializers.IntegerField(source="client.id", read_only=True, default=None)
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, default=None)
    trainer_id = serializers.IntegerField(source="trainer.id", read_only=True, default=None)

    class Meta(ScheduleEventListSerializer.Meta):
        fields = ScheduleEventListSerializer.Meta.fields + [
            "notes",
            "client_id",
            "branch_id",
            "trainer_id",
            "created_at",
            "updated_at",
        ]


class ScheduleEventWriteSerializer(serializers.ModelSerializer):
    client_id = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(),
        source="client",
        required=False,
        allow_null=True,
    )
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        source="branch",
        required=False,
        allow_null=True,
    )
    trainer_id = serializers.PrimaryKeyRelatedField(
        queryset=Trainer.objects.all(),
        source="trainer",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = ScheduleEvent
        fields = [
            "title",
            "trainer_name",
            "room",
            "starts_at",
            "ends_at",
            "status",
            "notes",
            "client_id",
            "branch_id",
            "trainer_id",
        ]

    def validate_client_id(self, client):
        company = self.context.get("company")
        if client and company and client.company_id != company.id:
            raise serializers.ValidationError("Клиент должен принадлежать текущей компании.")
        return client

    def validate_branch_id(self, branch):
        company = self.context.get("company")
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError("Филиал должен принадлежать текущей компании.")
        return branch

    def validate_trainer_id(self, trainer):
        company = self.context.get("company")
        if trainer and company and trainer.company_id != company.id:
            raise serializers.ValidationError("Тренер должен принадлежать текущей компании.")
        return trainer

    def create(self, validated_data: dict) -> ScheduleEvent:
        validated_data["company"] = self.context["company"]
        return super().create(validated_data)
