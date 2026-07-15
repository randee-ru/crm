from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from accounts.models import CompanyMembership, EmployeeInvitation, UserProfile
from branches.models import Branch
from telephony.phone import normalize_phone

User = get_user_model()


def _profile_for(user) -> UserProfile:
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def _validate_optional_phone(value: str | None) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    normalized = normalize_phone(raw)
    if len(normalized) != 11 or not normalized.startswith("7"):
        raise serializers.ValidationError("Укажите корректный российский номер телефона.")
    return normalized


class StaffMembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    display_name = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    birth_date = serializers.SerializerMethodField()
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
            "phone",
            "birth_date",
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

    def get_phone(self, membership: CompanyMembership) -> str:
        profile = getattr(membership.user, "profile", None)
        return profile.phone if profile else ""

    def get_birth_date(self, membership: CompanyMembership) -> str | None:
        profile = getattr(membership.user, "profile", None)
        if profile and profile.birth_date:
            return profile.birth_date.isoformat()
        return None


class StaffMembershipWriteSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    email = serializers.EmailField(source="user.email")
    phone = serializers.CharField(required=False, allow_blank=True, max_length=32)
    birth_date = serializers.DateField(required=False, allow_null=True)
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
            "phone",
            "birth_date",
            "role",
            "is_active",
            "branch_id",
        ]

    def validate_phone(self, value: str) -> str:
        return _validate_optional_phone(value)

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
        phone = validated_data.pop("phone", serializers.empty)
        birth_date = validated_data.pop("birth_date", serializers.empty)
        for field in ("first_name", "last_name", "email"):
            if field in user_data:
                setattr(instance.user, field, user_data[field])
        instance.user.save()

        if phone is not serializers.empty or birth_date is not serializers.empty:
            profile = _profile_for(instance.user)
            if phone is not serializers.empty:
                profile.phone = phone
            if birth_date is not serializers.empty:
                profile.birth_date = birth_date
            profile.save()

        return super().update(instance, validated_data)


class StaffMembershipCreateSerializer(serializers.Serializer):
    """Создаёт сотрудника сразу с паролем, без письма-приглашения."""

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True, max_length=32, default="")
    birth_date = serializers.DateField(required=False, allow_null=True)
    password = serializers.CharField(min_length=8, write_only=True, trim_whitespace=False)
    role = serializers.ChoiceField(choices=CompanyMembership.Role.choices, default=CompanyMembership.Role.EMPLOYEE)
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        source="branch",
        required=False,
        allow_null=True,
    )

    def validate_phone(self, value: str) -> str:
        return _validate_optional_phone(value)

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
            raise serializers.ValidationError("Сотрудник с таким email уже есть в компании.")
        return email

    def create(self, validated_data: dict) -> CompanyMembership:
        from accounts.serializers import _unique_username

        company = self.context["company"]
        email = validated_data["email"]
        first_name = validated_data["first_name"].strip()
        last_name = validated_data["last_name"].strip()
        password = validated_data["password"]
        role = validated_data["role"]
        branch = validated_data.get("branch")
        phone = validated_data.get("phone", "")
        birth_date = validated_data.get("birth_date")

        with transaction.atomic():
            user = User.objects.filter(email__iexact=email).first()
            if user is None:
                username = _unique_username(email.split("@", 1)[0].strip() or email)
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=password,
                )
            else:
                user.first_name = first_name
                user.last_name = last_name
                user.set_password(password)
                user.save()

            membership, created = CompanyMembership.objects.get_or_create(
                user=user,
                company=company,
                defaults={"branch": branch, "role": role, "is_active": True},
            )
            if not created:
                membership.branch = branch
                membership.role = role
                membership.is_active = True
                membership.save()

            if phone or birth_date is not None:
                profile = _profile_for(user)
                if phone:
                    profile.phone = phone
                if birth_date is not None:
                    profile.birth_date = birth_date
                profile.save()

        return membership


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
