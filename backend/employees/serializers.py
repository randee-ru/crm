from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from branches.models import Branch
from employees.models import Trainer, TrainerRentPayment


class TrainerListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    rent_paid_current_month = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = Trainer
        fields = [
            "id",
            "full_name",
            "first_name",
            "last_name",
            "phone",
            "email",
            "specialization",
            "trains_gym_floor",
            "trains_group_programs",
            "rent_paid_current_month",
            "is_active",
            "branch_name",
            "created_at",
        ]


class TrainerRentPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerRentPayment
        fields = ["id", "period", "amount", "paid_at", "note", "created_at"]


class TrainerDetailSerializer(TrainerListSerializer):
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, default=None)
    rent_payments = TrainerRentPaymentSerializer(many=True, read_only=True)

    class Meta(TrainerListSerializer.Meta):
        fields = TrainerListSerializer.Meta.fields + ["branch_id", "updated_at", "rent_payments"]


class TrainerWriteSerializer(serializers.ModelSerializer):
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        source="branch",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Trainer
        fields = [
            "first_name",
            "last_name",
            "phone",
            "email",
            "specialization",
            "trains_gym_floor",
            "trains_group_programs",
            "is_active",
            "branch_id",
        ]

    def validate_branch_id(self, branch: Branch | None) -> Branch | None:
        company = self.context.get("company")
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError("Филиал должен принадлежать текущей компании.")
        return branch

    def validate_phone(self, phone: str) -> str:
        company = self.context.get("company")
        trainer_id = self.instance.id if self.instance else None
        if company and Trainer.objects.filter(company=company, phone=phone).exclude(id=trainer_id).exists():
            raise serializers.ValidationError("Тренер с таким телефоном уже существует.")
        return phone

    def validate(self, attrs: dict) -> dict:
        trains_gym_floor = attrs.get(
            "trains_gym_floor",
            self.instance.trains_gym_floor if self.instance else False,
        )
        trains_group_programs = attrs.get(
            "trains_group_programs",
            self.instance.trains_group_programs if self.instance else False,
        )
        if not trains_gym_floor and not trains_group_programs:
            raise serializers.ValidationError(
                {"trains_gym_floor": "Укажите хотя бы один тип работы тренера."}
            )
        return attrs

    def create(self, validated_data: dict) -> Trainer:
        validated_data["company"] = self.context["company"]
        return super().create(validated_data)


class TrainerRentPaymentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerRentPayment
        fields = ["period", "amount", "paid_at", "note"]
        extra_kwargs = {"paid_at": {"required": False}}

    def create(self, validated_data: dict) -> TrainerRentPayment:
        validated_data["company"] = self.context["company"]
        validated_data["trainer"] = self.context["trainer"]
        validated_data.setdefault("paid_at", timezone.now())
        return super().create(validated_data)
