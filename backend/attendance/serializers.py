from __future__ import annotations

from rest_framework import serializers

from attendance.models import AttendanceRecord
from branches.models import Branch
from bookings.models import Booking
from clients.models import Client
from employees.models import Trainer
from memberships.models import Membership


class AttendanceRecordListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    trainer_name = serializers.CharField(source="trainer.full_name", read_only=True, default=None)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    membership_title = serializers.CharField(source="membership.title", read_only=True, default=None)
    booking_title = serializers.CharField(source="booking.title", read_only=True, default=None)
    duration_label = serializers.SerializerMethodField()
    is_in_club = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "status",
            "client_name",
            "trainer_name",
            "branch_name",
            "membership_title",
            "booking_title",
            "locker_key",
            "duration_label",
            "is_in_club",
            "checked_in_at",
            "checked_out_at",
            "created_at",
        ]

    def get_duration_label(self, record: AttendanceRecord) -> str | None:
        if not record.checked_in_at:
            return None
        end_at = record.checked_out_at
        from django.utils import timezone

        if not end_at:
            end_at = timezone.now()
        delta = end_at - record.checked_in_at
        total_minutes = max(int(delta.total_seconds() // 60), 0)
        hours, minutes = divmod(total_minutes, 60)
        if hours:
            return f"{hours:02d} ч. {minutes:02d} мин."
        return f"{minutes:02d} мин."

    def get_is_in_club(self, record: AttendanceRecord) -> bool:
        return (
            record.status == AttendanceRecord.Status.CHECKED_IN
            and record.checked_in_at is not None
            and record.checked_out_at is None
        )


class AttendanceRecordDetailSerializer(AttendanceRecordListSerializer):
    notes = serializers.CharField(read_only=True)
    client_id = serializers.IntegerField(source="client.id", read_only=True, default=None)
    trainer_id = serializers.IntegerField(source="trainer.id", read_only=True, default=None)
    branch_id = serializers.IntegerField(source="branch.id", read_only=True, default=None)
    membership_id = serializers.IntegerField(source="membership.id", read_only=True, default=None)
    booking_id = serializers.IntegerField(source="booking.id", read_only=True, default=None)

    class Meta(AttendanceRecordListSerializer.Meta):
        fields = AttendanceRecordListSerializer.Meta.fields + [
            "notes",
            "client_id",
            "trainer_id",
            "branch_id",
            "membership_id",
            "booking_id",
            "updated_at",
        ]


class AttendanceRecordWriteSerializer(serializers.ModelSerializer):
    client_id = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(),
        source="client",
        required=False,
        allow_null=True,
    )
    membership_id = serializers.PrimaryKeyRelatedField(
        queryset=Membership.objects.all(),
        source="membership",
        required=False,
        allow_null=True,
    )
    trainer_id = serializers.PrimaryKeyRelatedField(
        queryset=Trainer.objects.all(),
        source="trainer",
        required=False,
        allow_null=True,
    )
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        source="branch",
        required=False,
        allow_null=True,
    )
    booking_id = serializers.PrimaryKeyRelatedField(
        queryset=Booking.objects.all(),
        source="booking",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = AttendanceRecord
        fields = [
            "status",
            "checked_in_at",
            "checked_out_at",
            "notes",
            "client_id",
            "membership_id",
            "trainer_id",
            "branch_id",
            "booking_id",
        ]

    def validate_client_id(self, client):
        company = self.context.get("company")
        if client and company and client.company_id != company.id:
            raise serializers.ValidationError("Клиент должен принадлежать текущей компании.")
        return client

    def validate_membership_id(self, membership):
        company = self.context.get("company")
        if membership and company and membership.company_id != company.id:
            raise serializers.ValidationError("Абонемент должен принадлежать текущей компании.")
        return membership

    def validate_trainer_id(self, trainer):
        company = self.context.get("company")
        if trainer and company and trainer.company_id != company.id:
            raise serializers.ValidationError("Тренер должен принадлежать текущей компании.")
        return trainer

    def validate_branch_id(self, branch):
        company = self.context.get("company")
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError("Филиал должен принадлежать текущей компании.")
        return branch

    def validate_booking_id(self, booking):
        company = self.context.get("company")
        if booking and company and booking.company_id != company.id:
            raise serializers.ValidationError("Бронирование должно принадлежать текущей компании.")
        return booking

    def create(self, validated_data: dict) -> AttendanceRecord:
        validated_data["company"] = self.context["company"]
        return super().create(validated_data)
