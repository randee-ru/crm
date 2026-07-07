from __future__ import annotations

from django.utils import timezone
from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

from accounts.models import CompanyMembership, EmployeeInvitation, UserProfile

User = get_user_model()


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True, trim_whitespace=False)


class CompanyMembershipSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    company_slug = serializers.CharField(source="company.slug", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)

    class Meta:
        model = CompanyMembership
        fields = [
            "id",
            "company_name",
            "company_slug",
            "branch_name",
            "role",
            "is_active",
        ]


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "initials",
            "avatar_url",
        ]

    def get_display_name(self, user: User) -> str:
        full_name = user.get_full_name().strip()
        return full_name or user.username

    def get_initials(self, user: User) -> str:
        full_name = self.get_display_name(user)
        parts = full_name.split()
        if len(parts) >= 2:
            return f"{parts[0][0]}{parts[1][0]}".upper()
        return full_name[:2].upper()

    def get_avatar_url(self, user: User) -> str | None:
        profile = getattr(user, "profile", None)
        if profile is None or not profile.avatar:
            return None

        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(profile.avatar.url)
        return profile.avatar.url


class ProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    avatar = serializers.ImageField(required=False, allow_null=True)

    def validate_avatar(self, avatar):
        if avatar is None:
            return avatar

        if avatar.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("Размер файла не должен превышать 2 МБ.")

        content_type = getattr(avatar, "content_type", "")
        if content_type and not content_type.startswith("image/"):
            raise serializers.ValidationError("Можно загрузить только изображение.")

        return avatar

    def update(self, user: User, validated_data: dict) -> User:
        for field in ("first_name", "last_name", "email"):
            if field in validated_data:
                setattr(user, field, validated_data[field])

        if "avatar" in validated_data:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.avatar = validated_data["avatar"]
            profile.save(update_fields=["avatar", "updated_at"])

        user.save()
        return user


class AuthSessionSerializer(serializers.Serializer):
    token = serializers.CharField()
    user = serializers.DictField()
    memberships = CompanyMembershipSerializer(many=True)
    company = serializers.DictField()


class AcceptInvitationSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True, trim_whitespace=False)

    def validate(self, attrs: dict) -> dict:
        token = attrs["token"]
        try:
            invitation = EmployeeInvitation.objects.select_related("company", "branch").get(token=token)
        except EmployeeInvitation.DoesNotExist as exc:
            raise serializers.ValidationError({"token": "Приглашение не найдено."}) from exc

        if invitation.status != EmployeeInvitation.Status.PENDING:
            raise serializers.ValidationError({"token": "Приглашение уже использовано или отменено."})

        if invitation.expires_at and invitation.expires_at < timezone.now():
            invitation.status = EmployeeInvitation.Status.EXPIRED
            invitation.save(update_fields=["status", "updated_at"])
            raise serializers.ValidationError({"token": "Срок приглашения истёк."})

        attrs["invitation"] = invitation
        return attrs


def _unique_username(base: str) -> str:
    candidate = base[:150]
    index = 1
    while User.objects.filter(username=candidate).exists():
        suffix = f"-{index}"
        candidate = f"{base[:150-len(suffix)]}{suffix}"
        index += 1
    return candidate


def build_auth_session(user: User, token: str, request=None) -> dict:
    memberships = (
        CompanyMembership.objects.filter(
            user=user,
            is_active=True,
            company__is_active=True,
        )
        .select_related("company", "branch")
        .order_by("company__name")
    )
    membership_rows = CompanyMembershipSerializer(memberships, many=True).data
    primary_membership = memberships.first()
    company_payload = {}

    if primary_membership:
        company = primary_membership.company
        company_payload = {
            "id": company.id,
            "name": company.name,
            "slug": company.slug,
            "role": primary_membership.role,
            "branch_name": primary_membership.branch.name if primary_membership.branch else None,
            "clients_count": company.clients.count(),
            "clients_active_count": company.clients.filter(is_active=True).count(),
            "disabled_modules": company.disabled_modules,
        }

    user_data = UserSerializer(user, context={"request": request}).data

    return {
        "token": token,
        "user": user_data,
        "memberships": membership_rows,
        "company": company_payload,
    }


def authenticate_user(username: str, password: str) -> User | None:
    user = authenticate(username=username, password=password)
    if user is None or not user.is_active:
        return None

    if not CompanyMembership.objects.filter(user=user, is_active=True, company__is_active=True).exists():
        return None

    return user
