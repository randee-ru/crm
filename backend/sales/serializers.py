from __future__ import annotations

from rest_framework import serializers

from branches.models import Branch
from clients.models import Client
from employees.models import Trainer
from memberships.models import Membership
from sales.models import Sale


class SaleListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True, default=None)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    membership_title = serializers.CharField(source="membership.title", read_only=True, default=None)
    trainer_name = serializers.CharField(source="trainer.full_name", read_only=True, default=None)

    class Meta:
        model = Sale
        fields = [
            "id",
            "title",
            "status",
            "total_amount",
            "discount_amount",
            "paid_amount",
            "client_name",
            "branch_name",
            "membership_title",
            "trainer_name",
            "created_at",
        ]


class SaleDetailSerializer(SaleListSerializer):
    notes = serializers.CharField(read_only=True)
    client_id = serializers.IntegerField(source="client.id", read_only=True, default=None)
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, default=None)
    membership_id = serializers.IntegerField(source="membership.id", read_only=True, default=None)
    trainer_id = serializers.IntegerField(source="trainer.id", read_only=True, default=None)

    class Meta(SaleListSerializer.Meta):
        fields = SaleListSerializer.Meta.fields + [
            "notes",
            "client_id",
            "branch_id",
            "membership_id",
            "trainer_id",
            "sold_at",
            "updated_at",
        ]


class SaleWriteSerializer(serializers.ModelSerializer):
    client_id = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(),
        source="client",
        required=False,
        allow_null=True,
    )
    membership_id = serializers.PrimaryKeyRelatedField(
        queryset=Membership.objects.all(),
        source="membership",
        required=False,
        allow_null=True,
    )
    trainer_id = serializers.PrimaryKeyRelatedField(
        queryset=Trainer.objects.all(),
        source="trainer",
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
        model = Sale
        fields = [
            "title",
            "status",
            "total_amount",
            "discount_amount",
            "paid_amount",
            "sold_at",
            "notes",
            "client_id",
            "membership_id",
            "trainer_id",
            "branch_id",
        ]

    def validate_client_id(self, client):
        company = self.context.get("company")
        if client and company and client.company_id != company.id:
            raise serializers.ValidationError("Клиент должен принадлежать текущей компании.")
        return client

    def validate_membership_id(self, membership):
        company = self.context.get("company")
        if membership and company and membership.company_id != company.id:
            raise serializers.ValidationError("Абонемент должен принадлежать текущей компании.")
        return membership

    def validate_trainer_id(self, trainer):
        company = self.context.get("company")
        if trainer and company and trainer.company_id != company.id:
            raise serializers.ValidationError("Тренер должен принадлежать текущей компании.")
        return trainer

    def validate_branch_id(self, branch):
        company = self.context.get("company")
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError("Филиал должен принадлежать текущей компании.")
        return branch

    def create(self, validated_data: dict) -> Sale:
        validated_data["company"] = self.context["company"]
        return super().create(validated_data)
