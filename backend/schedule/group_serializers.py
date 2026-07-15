from __future__ import annotations

from datetime import datetime, timedelta

from django.utils import timezone
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
    trainer_display = serializers.SerializerMethodField()

    class Meta:
        model = GroupProgram
        fields = [
            "id",
            "trainer",
            "trainer_display",
            "room",
            "title",
            "code",
            "description",
            "color",
            "sort_order",
            "is_active",
        ]

    def get_trainer_display(self, program: GroupProgram) -> str:
        if program.trainer_id:
            return program.trainer.full_name
        return ""


class GroupProgramWriteSerializer(serializers.ModelSerializer):
    trainer = serializers.PrimaryKeyRelatedField(
        queryset=Trainer.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = GroupProgram
        fields = [
            "trainer",
            "room",
            "title",
            "code",
            "description",
            "color",
            "sort_order",
            "is_active",
        ]

    def validate_title(self, value: str) -> str:
        company = self.context.get("company")
        queryset = GroupProgram.objects.filter(title=value)
        if company is not None:
            queryset = queryset.filter(company=company)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Программа с таким названием уже существует.")
        return value

    def validate_trainer(self, trainer: Trainer | None) -> Trainer | None:
        company = self.context.get("company")
        if trainer and company and trainer.company_id != company.id:
            raise serializers.ValidationError("Тренер должен принадлежать текущей компании.")
        if trainer and not trainer.trains_group_programs:
            raise serializers.ValidationError("Выберите тренера групповых программ.")
        return trainer

    def create(self, validated_data: dict) -> GroupProgram:
        validated_data["company"] = self.context["company"]
        return super().create(validated_data)


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
        return slot.enrollments.filter(
            status__in=[GroupSlotEnrollment.Status.CONFIRMED, GroupSlotEnrollment.Status.COMPLETED],
        ).count()

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
        if trainer and not trainer.trains_group_programs:
            raise serializers.ValidationError("Выберите тренера групповых программ.")
        return trainer

    def create(self, validated_data: dict) -> GroupScheduleSlot:
        validated_data["company"] = self.context["company"]
        program = validated_data.get("program")
        if program is not None:
            room = validated_data.get("room")
            if not room:
                validated_data["room"] = program.room
            trainer = validated_data.get("trainer")
            if trainer is None and program.trainer and program.trainer.trains_group_programs:
                validated_data["trainer"] = program.trainer
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

    def validate(self, attrs: dict) -> dict:
        provider = attrs.get("provider", getattr(self.instance, "provider", ""))
        sender = str(attrs.get("sender_name", getattr(self.instance, "sender_name", "")) or "").strip()
        if provider == ScheduleSmsIntegration.Provider.SMS_RU:
            # Вариант 1: пустое имя — стандартный SMS.ru без ежемесячной платы.
            attrs["sender_name"] = sender
        return attrs

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
        if client.club_access_blocked:
            raise serializers.ValidationError("Клиент заблокирован для прохода в клуб.")
        if client.group_programs_blocked:
            raise serializers.ValidationError("Клиент заблокирован для групповых программ.")
        return client

    def validate(self, attrs: dict) -> dict:
        slot: GroupScheduleSlot = self.context["slot"]
        client = attrs.get("client") or getattr(self.instance, "client", None)
        if client is not None and self.instance is not None:
            queryset = GroupSlotEnrollment.objects.filter(slot=slot, client=client)
            queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({"client": "Клиент уже записан на это занятие."})
        return attrs

    def create(self, validated_data: dict) -> GroupSlotEnrollment:
        slot: GroupScheduleSlot = self.context["slot"]
        client: Client = validated_data["client"]
        existing = GroupSlotEnrollment.objects.filter(slot=slot, client=client).select_related("client").first()
        if existing is not None:
            return existing
        validated_data["slot"] = slot
        validated_data["company"] = slot.company
        occupied = slot.enrollments.filter(
            status__in=[GroupSlotEnrollment.Status.CONFIRMED, GroupSlotEnrollment.Status.COMPLETED],
        ).count()
        max_participants = slot.max_participants
        if not max_participants:
            settings = getattr(slot.company, "schedule_settings", None)
            max_participants = settings.default_max_participants if settings else 20
        if occupied >= max_participants:
            raise serializers.ValidationError({"client": "На занятие больше нет свободных мест."})
        return super().create(validated_data)


class PublicScheduleSlotSerializer(serializers.ModelSerializer):
    display_title = serializers.SerializerMethodField()
    display_color = serializers.SerializerMethodField()
    trainer_display = serializers.SerializerMethodField()
    program_code = serializers.CharField(source="program.code", read_only=True)
    max_participants = serializers.SerializerMethodField()
    seats_left = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()
    enrollment_id = serializers.SerializerMethodField()
    enrollment_status = serializers.SerializerMethodField()
    can_book = serializers.SerializerMethodField()
    is_past = serializers.SerializerMethodField()
    is_started = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()

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
            "max_participants",
            "seats_left",
            "is_enrolled",
            "enrollment_id",
            "enrollment_status",
            "can_book",
            "is_past",
            "is_started",
            "can_cancel",
        ]

    def _slot_capacity(self, slot: GroupScheduleSlot) -> tuple[int, int]:
        occupancy = self.context.get("occupancy", {})
        occupied = int(occupancy.get(slot.id, 0))
        max_participants = slot.max_participants or int(self.context.get("default_max", 20))
        return occupied, max_participants

    def get_max_participants(self, slot: GroupScheduleSlot) -> int:
        _, max_participants = self._slot_capacity(slot)
        return max_participants

    def get_seats_left(self, slot: GroupScheduleSlot) -> int:
        occupied, max_participants = self._slot_capacity(slot)
        return max(0, max_participants - occupied)

    def get_is_enrolled(self, slot: GroupScheduleSlot) -> bool:
        return slot.id in self.context.get("client_enrolled_slot_ids", set())

    def get_enrollment_id(self, slot: GroupScheduleSlot) -> int | None:
        if not self.get_is_enrolled(slot):
            return None
        value = self.context.get("client_enrollment_id_by_slot", {}).get(slot.id)
        return int(value) if value else None

    def get_enrollment_status(self, slot: GroupScheduleSlot) -> str | None:
        if not self.get_is_enrolled(slot):
            return None
        return self.context.get("client_enrollment_status_by_slot", {}).get(slot.id)

    def _session_start(self, slot: GroupScheduleSlot) -> datetime:
        session_start = datetime.combine(slot.session_date, slot.start_time)
        if timezone.is_aware(timezone.localtime()):
            return timezone.make_aware(session_start, timezone.get_current_timezone())
        return session_start

    def get_is_started(self, slot: GroupScheduleSlot) -> bool:
        return timezone.localtime() >= self._session_start(slot)

    def get_is_past(self, slot: GroupScheduleSlot) -> bool:
        now = timezone.localtime()
        session_end = datetime.combine(slot.session_date, slot.end_time)
        if timezone.is_aware(now):
            session_end = timezone.make_aware(session_end, timezone.get_current_timezone())
        return session_end < now

    def get_can_book(self, slot: GroupScheduleSlot) -> bool:
        if self.get_is_enrolled(slot):
            return False

        now = timezone.localtime()
        session_start = self._session_start(slot)
        if now >= session_start:
            return False

        # Запись закрывается за 1 час до начала.
        return now < session_start - timedelta(hours=1)

    def get_can_cancel(self, slot: GroupScheduleSlot) -> bool:
        if not self.get_is_enrolled(slot):
            return False

        if not self.get_enrollment_id(slot):
            return False

        now = timezone.localtime()
        session_start = datetime.combine(slot.session_date, slot.start_time)
        if timezone.is_aware(now):
            session_start = timezone.make_aware(session_start, timezone.get_current_timezone())

        # Отменить нельзя менее чем за 1 час до начала.
        cancel_deadline = session_start - timedelta(hours=1)
        return now < cancel_deadline

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
    weeks_back = serializers.IntegerField(required=False, default=0)
    date_from = serializers.DateField()
    date_to = serializers.DateField()
    booking_enabled = serializers.BooleanField(required=False, default=True)
    client = serializers.DictField(required=False, allow_null=True)
    slots = PublicScheduleSlotSerializer(many=True)


class PublicClientEnrollmentSerializer(serializers.ModelSerializer):
    slot_id = serializers.IntegerField(source="slot.id", read_only=True)
    session_date = serializers.DateField(source="slot.session_date", read_only=True)
    start_time = serializers.TimeField(source="slot.start_time", read_only=True)
    end_time = serializers.TimeField(source="slot.end_time", read_only=True)
    display_title = serializers.SerializerMethodField()
    display_color = serializers.SerializerMethodField()
    trainer_display = serializers.SerializerMethodField()
    room = serializers.CharField(source="slot.room", read_only=True)

    class Meta:
        model = GroupSlotEnrollment
        fields = [
            "id",
            "slot_id",
            "session_date",
            "start_time",
            "end_time",
            "display_title",
            "display_color",
            "trainer_display",
            "room",
            "status",
            "created_at",
        ]

    def get_display_title(self, enrollment: GroupSlotEnrollment) -> str:
        slot = enrollment.slot
        return slot.custom_title or slot.program.title

    def get_display_color(self, enrollment: GroupSlotEnrollment) -> str:
        slot = enrollment.slot
        return slot.color or slot.program.color

    def get_trainer_display(self, enrollment: GroupSlotEnrollment) -> str:
        slot = enrollment.slot
        if slot.trainer_id:
            return slot.trainer.full_name
        return slot.trainer_name or ""
