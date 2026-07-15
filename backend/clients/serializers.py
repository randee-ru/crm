from __future__ import annotations

from rest_framework import serializers

from accounts.models import CompanyMembership
from branches.models import Branch
from clients.models import Client, ClientNote


class BranchOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ["id", "name", "slug", "is_primary"]


class ClientOptionSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Client
        fields = ["id", "full_name", "phone"]


class ClientNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientNote
        fields = ["id", "body", "created_at", "updated_at"]


class ClientListSerializer(serializers.ModelSerializer):
    """Компактное представление клиента для CRM-списков."""

    full_name = serializers.CharField(read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    membership_status = serializers.SerializerMethodField()
    membership_title = serializers.SerializerMethodField()
    birth_date = serializers.DateField(read_only=True, default=None)
    membership_start = serializers.SerializerMethodField()
    membership_end = serializers.SerializerMethodField()
    registration_date = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id",
            "full_name",
            "last_name",
            "first_name",
            "middle_name",
            "phone",
            "secondary_phone",
            "email",
            "birth_date",
            "is_active",
            "client_status",
            "client_status_label",
            "branch_name",
            "club_access_blocked",
            "group_programs_blocked",
            "membership_status",
            "membership_title",
            "membership_start",
            "membership_end",
            "visit_count",
            "ltv_total",
            "manager_name",
            "last_visit_date",
            "registration_date",
            "created_at",
        ]

    def get_registration_date(self, client: Client) -> str:
        # У клиентов, импортированных из 1С, created_at — это момент импорта,
        # он одинаковый у всей пачки и не отражает реальную дату регистрации.
        # registration_date хранит настоящую историческую дату; для клиентов,
        # заведённых прямо в CRM, он пуст — тогда честно показываем created_at.
        if client.registration_date:
            return client.registration_date.isoformat()
        return client.created_at.date().isoformat()

    def get_membership_status(self, client: Client) -> str | None:
        membership = client.memberships.order_by("-starts_at").first()
        return membership.status if membership else None

    def get_membership_title(self, client: Client) -> str | None:
        membership = client.memberships.order_by("-starts_at").first()
        return membership.title if membership else None

    def get_membership_start(self, client: Client) -> str | None:
        membership = client.memberships.order_by("-starts_at").first()
        return membership.starts_at.isoformat() if membership and membership.starts_at else None

    def get_membership_end(self, client: Client) -> str | None:
        membership = client.memberships.order_by("-starts_at").first()
        return membership.ends_at.isoformat() if membership and membership.ends_at else None


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
            "last_name",
            "first_name",
            "middle_name",
            "phone",
            "secondary_phone",
            "email",
            "birth_date",
            "notes",
            "is_active",
            "club_access_blocked",
            "group_programs_blocked",
            "branch_id",
        ]

    def validate_branch_id(self, branch: Branch | None) -> Branch | None:
        company = self.context.get("company")
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError("Филиал должен принадлежать текущей компании.")
        return branch

    def _can_manage_blocks(self) -> bool:
        request = self.context.get("request")
        company = self.context.get("company")
        if request is None or company is None or not request.user.is_authenticated:
            return False
        return CompanyMembership.objects.filter(
            user=request.user,
            company=company,
            is_active=True,
            role__in=[
                CompanyMembership.Role.OWNER,
                CompanyMembership.Role.ADMIN,
                CompanyMembership.Role.MANAGER,
            ],
        ).exists()

    def _can_manage_marketing(self) -> bool:
        request = self.context.get("request")
        company = self.context.get("company")
        if request is None or company is None or not request.user.is_authenticated:
            return False
        return CompanyMembership.objects.filter(
            user=request.user,
            company=company,
            is_active=True,
            role=CompanyMembership.Role.ADMIN,
        ).exists()

    def validate(self, attrs):
        if not self._can_manage_blocks():
            blocked_fields = {"club_access_blocked", "group_programs_blocked"} & set(self.initial_data.keys())
            if blocked_fields:
                raise serializers.ValidationError(
                    {
                        "club_access_blocked": "Изменять блокировки могут только администратор, менеджер или руководитель.",
                        "group_programs_blocked": "Изменять блокировки могут только администратор, менеджер или руководитель.",
                    }
                )
        if not self._can_manage_marketing():
            blocked_fields = {"notes", "lead_source", "acquisition_channel", "manager_name"} & set(self.initial_data.keys())
            if blocked_fields:
                raise serializers.ValidationError(
                    {
                        "notes": "Изменять комментарий может только администратор.",
                        "lead_source": "Изменять маркетинг может только администратор.",
                        "acquisition_channel": "Изменять маркетинг может только администратор.",
                        "manager_name": "Изменять маркетинг может только администратор.",
                    }
                )
        return super().validate(attrs)

    def validate_phone(self, phone: str) -> str:
        return phone.strip()

    def validate_secondary_phone(self, phone: str) -> str:
        return phone.strip()

    def create(self, validated_data: dict) -> Client:
        validated_data["company"] = self.context["company"]
        return super().create(validated_data)


class ClientNoteWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientNote
        fields = ["body"]

    def validate_body(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Заметка не может быть пустой.")
        return value

    def create(self, validated_data: dict) -> ClientNote:
        validated_data["company"] = self.context["company"]
        validated_data["client"] = self.context["client"]
        return super().create(validated_data)
