from __future__ import annotations

from rest_framework import serializers

from branches.models import Branch
from clients.models import Client
from memberships.models import Membership


class MembershipListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    client_phone = serializers.CharField(source="client.phone", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    remaining_visits = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = [
            "id",
            "title",
            "status",
            "starts_at",
            "ends_at",
            "visit_limit",
            "visits_used",
            "remaining_visits",
            "price",
            "client_name",
            "client_phone",
            "branch_name",
            "notes",
            "created_at",
            "updated_at",
        ]

    def get_remaining_visits(self, membership: Membership) -> int | None:
        return membership.remaining_visits


class MembershipDetailSerializer(MembershipListSerializer):
    client_id = serializers.IntegerField(source="client.id", read_only=True, default=None)
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, default=None)
    notes = serializers.CharField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta(MembershipListSerializer.Meta):
        fields = MembershipListSerializer.Meta.fields + ["client_id", "branch_id"]


class MembershipWriteSerializer(serializers.ModelSerializer):
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
        model = Membership
        fields = [
            "title",
            "status",
            "starts_at",
            "ends_at",
            "visit_limit",
            "visits_used",
            "price",
            "notes",
            "client_id",
            "branch_id",
        ]

    def validate_client_id(self, client: Client | None) -> Client | None:
        company = self.context.get("company")
        if client and company and client.company_id != company.id:
            raise serializers.ValidationError("Клиент должен принадлежать текущей компании.")
        return client

    def validate_branch_id(self, branch: Branch | None) -> Branch | None:
        company = self.context.get("company")
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError("Филиал должен принадлежать текущей компании.")
        return branch

    def create(self, validated_data: dict) -> Membership:
        validated_data["company"] = self.context["company"]
        return super().create(validated_data)
