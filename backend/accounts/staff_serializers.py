from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.models import CompanyMembership, EmployeeInvitation
from branches.models import Branch

User = get_user_model()


class StaffMembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    display_name = serializers.SerializerMethodField()
    last_login = serializers.DateTimeField(source="user.last_login", read_only=True)
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, default=None)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)

    class Meta:
        model = CompanyMembership
        fields = [
            "id",
            "user_id",
            "username",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "role",
            "is_active",
            "branch_id",
            "branch_name",
            "last_login",
            "created_at",
            "updated_at",
        ]

    def get_display_name(self, membership: CompanyMembership) -> str:
        return membership.user.get_full_name().strip() or membership.user.username


class StaffMembershipWriteSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    email = serializers.EmailField(source="user.email")
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        source="branch",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = CompanyMembership
        fields = [
            "first_name",
            "last_name",
            "email",
            "role",
            "is_active",
            "branch_id",
        ]

    def validate_branch_id(self, branch: Branch | None) -> Branch | None:
        company = self.context.get("company")
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError("Филиал должен принадлежать текущей компании.")
        return branch

    def validate(self, attrs: dict) -> dict:
        user_data = attrs.get("user", {})
        email = user_data.get("email", "").strip()
        company = self.context.get("company")
        instance = self.instance
        if company and email:
            queryset = CompanyMembership.objects.filter(company=company, user__email__iexact=email)
            if instance is not None:
                queryset = queryset.exclude(id=instance.id)
            if queryset.exists():
                raise serializers.ValidationError({"email": "Сотрудник с таким email уже есть в компании."})
        return attrs

    def update(self, instance: CompanyMembership, validated_data: dict) -> CompanyMembership:
        user_data = validated_data.pop("user", {})
        for field in ("first_name", "last_name", "email"):
            if field in user_data:
                setattr(instance.user, field, user_data[field])
        instance.user.save()
        return super().update(instance, validated_data)


class StaffInvitationSerializer(serializers.ModelSerializer):
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, default=None)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    invite_url = serializers.CharField(read_only=True)

    class Meta:
        model = EmployeeInvitation
        fields = [
            "id",
            "email",
            "full_name",
            "role",
            "status",
            "branch_id",
            "branch_name",
            "message",
            "invite_url",
            "expires_at",
            "accepted_at",
            "created_at",
            "updated_at",
        ]


class StaffInvitationWriteSerializer(serializers.ModelSerializer):
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        source="branch",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = EmployeeInvitation
        fields = [
            "email",
            "full_name",
            "role",
            "message",
            "expires_at",
            "branch_id",
        ]

    def validate_branch_id(self, branch: Branch | None) -> Branch | None:
        company = self.context.get("company")
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError("Филиал должен принадлежать текущей компании.")
        return branch

    def validate_email(self, email: str) -> str:
        company = self.context.get("company")
        if company and CompanyMembership.objects.filter(
            company=company,
            user__email__iexact=email,
            is_active=True,
        ).exists():
            raise serializers.ValidationError("Сотрудник с таким email уже имеет доступ к компании.")
        return email

    def create(self, validated_data: dict) -> EmployeeInvitation:
        validated_data["company"] = self.context["company"]
        validated_data["invited_by"] = self.context["request"].user
        return super().create(validated_data)
