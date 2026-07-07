from __future__ import annotations

from rest_framework import serializers

from branches.models import Branch
from clients.models import Client
from contracts.models import Contract
from memberships.models import Membership


class ContractListSerializer(serializers.ModelSerializer):
    title = serializers.CharField(read_only=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)

    class Meta:
        model = Contract
        fields = [
            "id",
            "title",
            "contract_date",
            "prefix",
            "is_signed",
            "number",
            "branch_name",
            "client_name",
            "client_id",
            "template_name",
            "membership_label",
            "created_at",
        ]


class ContractWriteSerializer(serializers.ModelSerializer):
    client_id = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(),
        source="client",
    )
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        source="branch",
        required=False,
        allow_null=True,
    )
    membership_id = serializers.PrimaryKeyRelatedField(
        queryset=Membership.objects.all(),
        source="membership",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Contract
        fields = [
            "client_id",
            "branch_id",
            "membership_id",
            "number",
            "prefix",
            "contract_date",
            "template_name",
            "membership_label",
            "is_signed",
        ]

    def validate_number(self, value: str) -> str:
        trimmed = value.strip().replace(" ", "")
        if not trimmed:
            raise serializers.ValidationError("Укажите номер договора.")
        return trimmed

    def validate(self, attrs: dict) -> dict:
        company = self.context["company"]
        client = attrs.get("client")
        branch = attrs.get("branch")
        membership = attrs.get("membership")

        if client and client.company_id != company.id:
            raise serializers.ValidationError({"client_id": "Клиент не принадлежит компании."})
        if branch and branch.company_id != company.id:
            raise serializers.ValidationError({"branch_id": "Филиал не принадлежит компании."})
        if membership and membership.company_id != company.id:
            raise serializers.ValidationError({"membership_id": "Абонемент не принадлежит компании."})
        return attrs

    def create(self, validated_data: dict) -> Contract:
        membership = validated_data.get("membership")
        if membership and not validated_data.get("membership_label"):
            validated_data["membership_label"] = membership.title
        return Contract.objects.create(company=self.context["company"], **validated_data)
