from __future__ import annotations

from rest_framework import serializers

from attendance.models import AttendanceRecord
from bookings.models import Booking
from clients.models import Client, ClientLead, ClientMessage
from crm.models import Deal
from sales.models import Sale
from telephony.lines import resolve_call_log_line_display
from telephony.models import CallLog


class ClientCallSerializer(serializers.ModelSerializer):
    line_display = serializers.SerializerMethodField()
    has_recording = serializers.SerializerMethodField()

    class Meta:
        model = CallLog
        fields = [
            "id",
            "direction",
            "status",
            "caller_phone",
            "target_phone",
            "line_name",
            "line_display",
            "duration",
            "started_at",
            "has_recording",
            "transcription_text",
            "call_summary",
        ]

    def get_line_display(self, obj: CallLog) -> str:
        line_directory = self.context.get("line_directory") or {}
        return resolve_call_log_line_display(obj, line_directory)

    def get_has_recording(self, obj: CallLog) -> bool:
        return bool(obj.recording_id or obj.recording_url or obj.recording_file)

class ClientMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientMessage
        fields = [
            "id",
            "channel",
            "message_type",
            "kind",
            "source",
            "phone",
            "body",
            "sent_at",
        ]


class ClientLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientLead
        fields = [
            "id",
            "title",
            "status",
            "channel",
            "club_name",
            "manager_name",
            "comment",
            "ad_source",
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "lead_date",
        ]


class ClientVisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "checked_in_at",
            "checked_out_at",
            "duration_minutes",
            "room",
            "visit_source",
            "locker_key",
            "status",
        ]


class ClientSaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = [
            "id",
            "title",
            "external_number",
            "total_amount",
            "paid_amount",
            "promo_code",
            "installment_info",
            "status",
            "sold_at",
            "created_at",
        ]


class ClientDealSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source="stage.name", read_only=True)

    class Meta:
        model = Deal
        fields = [
            "id",
            "title",
            "description",
            "amount",
            "deal_type",
            "source_name",
            "channel",
            "result_label",
            "manager_name",
            "stage_name",
            "closed_at",
            "created_at",
        ]


class ClientLessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = [
            "id",
            "title",
            "starts_at",
            "ends_at",
            "status",
            "room",
            "lesson_type",
            "payment_basis",
            "source",
        ]


class ClientProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    messages = ClientMessageSerializer(many=True, read_only=True)
    leads = ClientLeadSerializer(many=True, read_only=True)
    visits = serializers.SerializerMethodField()
    sales = serializers.SerializerMethodField()
    deals = serializers.SerializerMethodField()
    lessons = serializers.SerializerMethodField()
    memberships = serializers.SerializerMethodField()
    calls = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id",
            "external_id",
            "full_name",
            "first_name",
            "last_name",
            "middle_name",
            "phone",
            "email",
            "birth_date",
            "gender",
            "passport",
            "card_number",
            "card_status",
            "client_status",
            "client_status_label",
            "manager_name",
            "lead_source",
            "acquisition_channel",
            "club_name",
            "contract_ref",
            "ltv_total",
            "visit_count",
            "visit_frequency",
            "max_break_days",
            "registration_date",
            "last_visit_date",
            "last_payment_date",
            "last_interaction_date",
            "membership_name",
            "membership_status",
            "membership_start",
            "membership_end",
            "tags",
            "interests",
            "notes",
            "is_active",
            "club_access_blocked",
            "group_programs_blocked",
            "branch_name",
            "created_at",
            "updated_at",
            "messages",
            "leads",
            "visits",
            "sales",
            "deals",
            "lessons",
            "memberships",
            "calls",
        ]

    def _limit(self, queryset, limit: int = 50):
        return queryset[:limit]

    def get_visits(self, client: Client) -> list[dict]:
        qs = client.attendance_records.order_by("-checked_in_at", "-id")
        return ClientVisitSerializer(self._limit(qs), many=True).data

    def get_sales(self, client: Client) -> list[dict]:
        qs = client.sales.order_by("-sold_at", "-created_at")
        return ClientSaleSerializer(self._limit(qs), many=True).data

    def get_deals(self, client: Client) -> list[dict]:
        qs = client.deals.select_related("stage").order_by("-created_at")
        return ClientDealSerializer(self._limit(qs), many=True).data

    def get_lessons(self, client: Client) -> list[dict]:
        qs = client.bookings.order_by("-starts_at")
        return ClientLessonSerializer(self._limit(qs), many=True).data

    def get_memberships(self, client: Client) -> list[dict]:
        memberships = client.memberships.order_by("-starts_at")
        return [
            {
                "id": item.id,
                "title": item.title,
                "status": item.status,
                "starts_at": item.starts_at,
                "ends_at": item.ends_at,
                "price": str(item.price),
            }
            for item in self._limit(memberships)
        ]

    def get_calls(self, client: Client) -> list[dict]:
        qs = client.call_logs.order_by("-started_at", "-id")
        return ClientCallSerializer(self._limit(qs, 100), many=True, context=self.context).data
