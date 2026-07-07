from __future__ import annotations

from rest_framework import serializers

from branches.models import Branch
from clients.models import Client
from memberships.models import Membership
from payments.models import Payment
from sales.models import Sale


class PaymentListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True, default=None)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    sale_title = serializers.CharField(source="sale.title", read_only=True, default=None)
    membership_title = serializers.CharField(source="membership.title", read_only=True, default=None)

    class Meta:
        model = Payment
        fields = [
            "id",
            "amount",
            "method",
            "status",
            "paid_at",
            "client_name",
            "branch_name",
            "sale_title",
            "membership_title",
            "created_at",
        ]


class PaymentDetailSerializer(PaymentListSerializer):
    notes = serializers.CharField(read_only=True)
    client_id = serializers.IntegerField(source="client.id", read_only=True, default=None)
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, default=None)
    sale_id = serializers.IntegerField(source="sale.id", read_only=True, default=None)
    membership_id = serializers.IntegerField(source="membership.id", read_only=True, default=None)

    class Meta(PaymentListSerializer.Meta):
        fields = PaymentListSerializer.Meta.fields + [
            "notes",
            "client_id",
            "branch_id",
            "sale_id",
            "membership_id",
            "external_id",
            "updated_at",
        ]


class PaymentWriteSerializer(serializers.ModelSerializer):
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
    sale_id = serializers.PrimaryKeyRelatedField(
        queryset=Sale.objects.all(),
        source="sale",
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
        model = Payment
        fields = [
            "amount",
            "method",
            "status",
            "paid_at",
            "external_id",
            "notes",
            "client_id",
            "membership_id",
            "sale_id",
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

    def validate_sale_id(self, sale):
        company = self.context.get("company")
        if sale and company and sale.company_id != company.id:
            raise serializers.ValidationError("Продажа должна принадлежать текущей компании.")
        return sale

    def validate_branch_id(self, branch):
        company = self.context.get("company")
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError("Филиал должен принадлежать текущей компании.")
        return branch

    def create(self, validated_data: dict) -> Payment:
        validated_data["company"] = self.context["company"]
        return super().create(validated_data)
