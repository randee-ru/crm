from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from branches.models import Branch
from employees.models import Trainer, TrainerAccessCard, TrainerRentPayment


class TrainerListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    rent_paid_current_month = serializers.BooleanField(read_only=True, default=False)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Trainer
        fields = [
            "id",
            "full_name",
            "first_name",
            "middle_name",
            "last_name",
            "phone",
            "email",
            "specialization",
            "photo_url",
            "trains_gym_floor",
            "trains_group_programs",
            "rent_paid_current_month",
            "is_active",
            "branch_name",
            "created_at",
        ]

    def get_photo_url(self, trainer: Trainer) -> str | None:
        if not trainer.photo:
            return None
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(trainer.photo.url)
        return trainer.photo.url


class TrainerRentPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerRentPayment
        fields = ["id", "period", "amount", "paid_at", "note", "created_at"]


class TrainerAccessCardSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = TrainerAccessCard
        fields = ["id", "card_number", "status", "status_label", "issued_at", "note", "created_at"]


class TrainerDetailSerializer(TrainerListSerializer):
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, default=None)
    rent_payments = TrainerRentPaymentSerializer(many=True, read_only=True)
    access_cards = TrainerAccessCardSerializer(many=True, read_only=True)

    class Meta(TrainerListSerializer.Meta):
        fields = TrainerListSerializer.Meta.fields + [
            "branch_id",
            "achievements",
            "bio",
            "updated_at",
            "rent_payments",
            "access_cards",
        ]


class TrainerWriteSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=32)
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        source="branch",
        required=False,
        allow_null=True,
    )
    photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Trainer
        fields = [
            "first_name",
            "middle_name",
            "last_name",
            "phone",
            "email",
            "specialization",
            "photo",
            "achievements",
            "bio",
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

    def validate_phone(self, phone: str | None) -> str | None:
        normalized = (phone or "").strip()
        if not normalized:
            return None

        company = self.context.get("company")
        trainer_id = self.instance.id if self.instance else None
        if company and Trainer.objects.filter(company=company, phone=normalized).exclude(id=trainer_id).exists():
            raise serializers.ValidationError("Тренер с таким телефоном уже существует.")
        return normalized

    def validate_photo(self, photo):
        if photo is None:
            return photo

        if photo.size > 3 * 1024 * 1024:
            raise serializers.ValidationError("Размер файла не должен превышать 3 МБ.")

        content_type = getattr(photo, "content_type", "")
        if content_type and not content_type.startswith("image/"):
            raise serializers.ValidationError("Можно загрузить только изображение.")

        return photo

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


class TrainerAccessCardWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerAccessCard
        fields = ["card_number", "status", "issued_at", "note"]
        extra_kwargs = {"issued_at": {"required": False}, "status": {"required": False}}

    def validate_card_number(self, card_number: str) -> str:
        company = self.context.get("company")
        card_id = self.instance.id if self.instance else None
        if (
            company
            and TrainerAccessCard.objects.filter(company=company, card_number=card_number)
            .exclude(id=card_id)
            .exists()
        ):
            raise serializers.ValidationError("Карта с таким номером уже выдана в этой компании.")
        return card_number

    def create(self, validated_data: dict) -> TrainerAccessCard:
        validated_data["company"] = self.context["company"]
        validated_data["trainer"] = self.context["trainer"]
        validated_data.setdefault("issued_at", timezone.now())
        return super().create(validated_data)
