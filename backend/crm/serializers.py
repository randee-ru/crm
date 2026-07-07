from __future__ import annotations

from rest_framework import serializers

from branches.models import Branch
from clients.models import Client
from crm.models import Task


class TaskListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True, default=None)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "status",
            "priority",
            "due_at",
            "client_name",
            "branch_name",
            "assigned_to_name",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_assigned_to_name(self, task: Task) -> str | None:
        if not task.assigned_to_id:
            return None
        full_name = task.assigned_to.get_full_name().strip()
        return full_name or task.assigned_to.username

    def get_created_by_name(self, task: Task) -> str | None:
        if not task.created_by_id:
            return None
        full_name = task.created_by.get_full_name().strip()
        return full_name or task.created_by.username


class TaskDetailSerializer(TaskListSerializer):
    description = serializers.CharField(read_only=True)
    client_id = serializers.IntegerField(source="client.id", read_only=True, default=None)
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, default=None)
    assigned_to_id = serializers.IntegerField(read_only=True, default=None)

    class Meta(TaskListSerializer.Meta):
        fields = TaskListSerializer.Meta.fields + [
            "description",
            "client_id",
            "branch_id",
            "assigned_to_id",
        ]


class TaskWriteSerializer(serializers.ModelSerializer):
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

    class Meta:
        model = Task
        fields = [
            "title",
            "description",
            "status",
            "priority",
            "due_at",
            "client_id",
            "branch_id",
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

    def create(self, validated_data: dict) -> Task:
        validated_data["company"] = self.context["company"]
        validated_data["created_by"] = self.context["request"].user
        validated_data["assigned_to"] = self.context["request"].user
        return super().create(validated_data)
