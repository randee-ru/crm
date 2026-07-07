from __future__ import annotations

from rest_framework import serializers

from branches.models import Branch
from clients.models import Client


class BranchOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ["id", "name", "slug", "is_primary"]


class ClientListSerializer(serializers.ModelSerializer):
    """Компактное представление клиента для CRM-списков."""

    full_name = serializers.CharField(read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    membership_status = serializers.SerializerMethodField()
    membership_title = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id",
            "full_name",
            "first_name",
            "last_name",
            "phone",
            "email",
            "is_active",
            "client_status",
            "client_status_label",
            "branch_name",
            "membership_status",
            "membership_title",
            "visit_count",
            "ltv_total",
            "manager_name",
            "last_visit_date",
            "created_at",
        ]

    def get_membership_status(self, client: Client) -> str | None:
        membership = client.memberships.order_by("-starts_at").first()
        return membership.status if membership else None

    def get_membership_title(self, client: Client) -> str | None:
        membership = client.memberships.order_by("-starts_at").first()
        return membership.title if membership else None


class ClientDetailSerializer(ClientListSerializer):
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, default=None)
    notes = serializers.CharField(read_only=True)

    class Meta(ClientListSerializer.Meta):
        fields = ClientListSerializer.Meta.fields + [
            "branch_id",
            "notes",
            "updated_at",
        ]


class ClientWriteSerializer(serializers.ModelSerializer):
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        source="branch",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Client
        fields = [
            "first_name",
            "last_name",
            "phone",
            "email",
            "birth_date",
            "notes",
            "is_active",
            "branch_id",
        ]

    def validate_branch_id(self, branch: Branch | None) -> Branch | None:
        company = self.context.get("company")
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError("Филиал должен принадлежать текущей компании.")
        return branch

    def validate_phone(self, phone: str) -> str:
        return phone.strip()

    def create(self, validated_data: dict) -> Client:
        validated_data["company"] = self.context["company"]
        return super().create(validated_data)
