from __future__ import annotations

from rest_framework import serializers

from branches.models import Branch
from clients.models import Client
from employees.models import Trainer
from schedule.models import (
    GroupProgram,
    GroupScheduleSlot,
    GroupSlotEnrollment,
    ScheduleSettings,
    ScheduleSmsIntegration,
)


class GroupProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupProgram
        fields = [
            "id",
            "title",
            "code",
            "description",
            "color",
            "sort_order",
            "is_active",
        ]


class GroupScheduleSlotSerializer(serializers.ModelSerializer):
    program_title = serializers.CharField(source="program.title", read_only=True)
    program_code = serializers.CharField(source="program.code", read_only=True)
    program_color = serializers.CharField(source="program.color", read_only=True)
    program_description = serializers.CharField(source="program.description", read_only=True)
    trainer_display = serializers.SerializerMethodField()
    display_title = serializers.SerializerMethodField()
    display_color = serializers.SerializerMethodField()
    enrollment_count = serializers.SerializerMethodField()
    max_participants_effective = serializers.SerializerMethodField()
    weekday = serializers.SerializerMethodField()

    class Meta:
        model = GroupScheduleSlot
        fields = [
            "id",
            "program",
            "program_title",
            "program_code",
            "program_color",
            "program_description",
            "display_title",
            "custom_title",
            "color",
            "display_color",
            "max_participants",
            "max_participants_effective",
            "enrollment_count",
            "session_date",
            "weekday",
            "start_time",
            "end_time",
            "room",
            "trainer_name",
            "trainer",
            "trainer_display",
            "description",
            "restrictions",
            "branch",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_trainer_display(self, slot: GroupScheduleSlot) -> str:
        if slot.trainer_id:
            return slot.trainer.full_name
        return slot.trainer_name or ""

    def get_display_title(self, slot: GroupScheduleSlot) -> str:
        return slot.custom_title or slot.program.title

    def get_display_color(self, slot: GroupScheduleSlot) -> str:
        return slot.color or slot.program.color

    def get_enrollment_count(self, slot: GroupScheduleSlot) -> int:
        if hasattr(slot, "enrollment_count_annotated"):
            return int(slot.enrollment_count_annotated)
        return slot.enrollments.filter(status=GroupSlotEnrollment.Status.CONFIRMED).count()

    def get_max_participants_effective(self, slot: GroupScheduleSlot) -> int:
        if slot.max_participants:
            return slot.max_participants
        settings = self.context.get("schedule_settings")
        if settings:
            return settings.default_max_participants
        company_settings = getattr(slot.company, "schedule_settings", None)
        if company_settings:
            return company_settings.default_max_participants
        return 20

    def get_weekday(self, slot: GroupScheduleSlot) -> int:
        return slot.session_date.weekday()


class GroupScheduleSlotWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupScheduleSlot
        fields = [
            "program",
            "session_date",
            "start_time",
            "end_time",
            "room",
            "trainer_name",
            "trainer",
            "description",
            "restrictions",
            "custom_title",
            "color",
            "max_participants",
            "branch",
            "is_active",
        ]

    def validate_program(self, program: GroupProgram) -> GroupProgram:
        company = self.context.get("company")
        if company and program.company_id != company.id:
            raise serializers.ValidationError("Программа должна принадлежать текущей компании.")
        return program

    def validate_branch(self, branch: Branch | None) -> Branch | None:
        company = self.context.get("company")
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError("Филиал должен принадлежать текущей компании.")
        return branch

    def validate_trainer(self, trainer: Trainer | None) -> Trainer | None:
        company = self.context.get("company")
        if trainer and company and trainer.company_id != company.id:
            raise serializers.ValidationError("Тренер должен принадлежать текущей компании.")
        return trainer

    def create(self, validated_data: dict) -> GroupScheduleSlot:
        validated_data["company"] = self.context["company"]
        return super().create(validated_data)


class ScheduleSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleSettings
        fields = [
            "default_max_participants",
            "sms_reminder_hours",
            "is_published",
            "publish_weeks_ahead",
            "embed_token",
            "updated_at",
        ]
        read_only_fields = ["embed_token", "updated_at"]


class ScheduleSettingsWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleSettings
        fields = [
            "default_max_participants",
            "sms_reminder_hours",
            "is_published",
            "publish_weeks_ahead",
        ]

    def validate_sms_reminder_hours(self, value: list) -> list:
        if not isinstance(value, list):
            raise serializers.ValidationError("Ожидается список часов.")
        cleaned: list[int] = []
        for item in value:
            try:
                hours = int(item)
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError("Каждое значение должно быть числом.") from exc
            if hours <= 0 or hours > 168:
                raise serializers.ValidationError("Часы должны быть от 1 до 168.")
            if hours not in cleaned:
                cleaned.append(hours)
        return sorted(cleaned, reverse=True)


class ScheduleSmsIntegrationSerializer(serializers.ModelSerializer):
    has_api_key = serializers.SerializerMethodField()
    has_api_secret = serializers.SerializerMethodField()

    class Meta:
        model = ScheduleSmsIntegration
        fields = [
            "id",
            "provider",
            "title",
            "sender_name",
            "webhook_url",
            "settings",
            "is_active",
            "is_primary",
            "has_api_key",
            "has_api_secret",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def get_has_api_key(self, obj: ScheduleSmsIntegration) -> bool:
        return bool(obj.api_key)

    def get_has_api_secret(self, obj: ScheduleSmsIntegration) -> bool:
        return bool(obj.api_secret)


class ScheduleSmsIntegrationWriteSerializer(serializers.ModelSerializer):
    api_key = serializers.CharField(required=False, allow_blank=True)
    api_secret = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = ScheduleSmsIntegration
        fields = [
            "provider",
            "title",
            "api_key",
            "api_secret",
            "sender_name",
            "webhook_url",
            "settings",
            "is_active",
            "is_primary",
        ]

    def create(self, validated_data: dict) -> ScheduleSmsIntegration:
        validated_data["company"] = self.context["company"]
        return super().create(validated_data)

    def update(self, instance: ScheduleSmsIntegration, validated_data: dict) -> ScheduleSmsIntegration:
        if validated_data.get("api_key") == "":
            validated_data.pop("api_key", None)
        if validated_data.get("api_secret") == "":
            validated_data.pop("api_secret", None)
        return super().update(instance, validated_data)


class GroupSlotEnrollmentSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    client_phone = serializers.CharField(source="client.phone", read_only=True)

    class Meta:
        model = GroupSlotEnrollment
        fields = [
            "id",
            "slot",
            "client",
            "client_name",
            "client_phone",
            "status",
            "notes",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class GroupSlotEnrollmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupSlotEnrollment
        fields = ["client", "status", "notes"]

    def validate_client(self, client: Client) -> Client:
        company = self.context.get("company")
        if company and client.company_id != company.id:
            raise serializers.ValidationError("Клиент должен принадлежать текущей компании.")
        return client

    def create(self, validated_data: dict) -> GroupSlotEnrollment:
        slot: GroupScheduleSlot = self.context["slot"]
        validated_data["slot"] = slot
        validated_data["company"] = slot.company
        confirmed = slot.enrollments.filter(status=GroupSlotEnrollment.Status.CONFIRMED).count()
        max_participants = slot.max_participants
        if not max_participants:
            settings = getattr(slot.company, "schedule_settings", None)
            max_participants = settings.default_max_participants if settings else 20
        if confirmed >= max_participants:
            raise serializers.ValidationError({"client": "На занятие больше нет свободных мест."})
        return super().create(validated_data)


class PublicScheduleSlotSerializer(serializers.ModelSerializer):
    display_title = serializers.SerializerMethodField()
    display_color = serializers.SerializerMethodField()
    trainer_display = serializers.SerializerMethodField()
    program_code = serializers.CharField(source="program.code", read_only=True)

    class Meta:
        model = GroupScheduleSlot
        fields = [
            "id",
            "session_date",
            "start_time",
            "end_time",
            "display_title",
            "display_color",
            "program_code",
            "room",
            "trainer_display",
            "description",
            "restrictions",
        ]

    def get_display_title(self, slot: GroupScheduleSlot) -> str:
        return slot.custom_title or slot.program.title

    def get_display_color(self, slot: GroupScheduleSlot) -> str:
        return slot.color or slot.program.color

    def get_trainer_display(self, slot: GroupScheduleSlot) -> str:
        if slot.trainer_id:
            return slot.trainer.full_name
        return slot.trainer_name or ""


class PublicSchedulePayloadSerializer(serializers.Serializer):
    company_name = serializers.CharField()
    company_slug = serializers.CharField()
    weeks_ahead = serializers.IntegerField()
    date_from = serializers.DateField()
    date_to = serializers.DateField()
    slots = PublicScheduleSlotSerializer(many=True)
