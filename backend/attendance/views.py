from __future__ import annotations

from datetime import datetime, timedelta

from django.db.models import Q, QuerySet
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from attendance.models import AttendanceRecord
from attendance.serializers import (
    AttendanceRecordDetailSerializer,
    AttendanceRecordListSerializer,
    AttendanceRecordWriteSerializer,
)
from clients.views import get_company_from_request


class AttendanceQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_attendance_queryset(self) -> QuerySet[AttendanceRecord]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return AttendanceRecord.objects.none()

        return (
            AttendanceRecord.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related("branch", "client", "membership", "trainer", "booking", "company")
            .order_by("-checked_in_at", "-created_at")
        )


class AttendanceRecordListCreateView(AttendanceQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return AttendanceRecordWriteSerializer
        return AttendanceRecordListSerializer

    def get_queryset(self) -> QuerySet[AttendanceRecord]:
        queryset = self.get_company_attendance_queryset()

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
                | Q(trainer__first_name__icontains=search)
                | Q(trainer__last_name__icontains=search)
                | Q(booking__title__icontains=search)
                | Q(locker_key__icontains=search)
            )

        status = self.request.query_params.get("status", "").strip()
        if status:
            queryset = queryset.filter(status=status)

        when = self.request.query_params.get("when", "").strip()
        now = timezone.now()
        if when == "now":
            queryset = queryset.filter(
                status=AttendanceRecord.Status.CHECKED_IN,
                checked_in_at__isnull=False,
                checked_out_at__isnull=True,
            )
        elif when == "today":
            queryset = queryset.filter(checked_in_at__date=now.date())
        elif when == "yesterday":
            queryset = queryset.filter(checked_in_at__date=(now.date() - timedelta(days=1)))
        elif when == "date":
            date_raw = self.request.query_params.get("date", "").strip()
            try:
                selected = datetime.strptime(date_raw, "%Y-%m-%d").date()
            except ValueError:
                selected = now.date()
            queryset = queryset.filter(checked_in_at__date=selected)

        person = self.request.query_params.get("person", "").strip()
        if person == "staff":
            queryset = queryset.filter(trainer__isnull=False)
        elif person == "clients":
            queryset = queryset.filter(client__isnull=False)

        return queryset

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context

    def perform_create(self, serializer) -> None:
        company = get_company_from_request(self.request)
        if company is None:
            raise ValueError("Company context is required.")
        serializer.save(company=company)

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = AttendanceRecordWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        read_serializer = AttendanceRecordListSerializer(
            write_serializer.instance,
            context=self.get_serializer_context(),
        )
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=201, headers=headers)


class AttendanceRecordDetailView(AttendanceQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "attendance_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return AttendanceRecordWriteSerializer
        return AttendanceRecordDetailSerializer

    def get_queryset(self) -> QuerySet[AttendanceRecord]:
        return self.get_company_attendance_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        instance.delete()
        return Response(status=204)


class AttendanceOccupancyView(AttendanceQuerysetMixin, APIView):
    def get(self, request: Request) -> Response:
        now = timezone.localtime()
        day_start = now.replace(hour=6, minute=0, second=0, microsecond=0)
        if now.hour < 6:
            day_start -= timedelta(days=1)

        queryset = self.get_company_attendance_queryset().filter(
            checked_in_at__date=day_start.date(),
            checked_in_at__isnull=False,
        )

        buckets: list[dict[str, str | int]] = []
        cursor = day_start
        end_limit = min(now, day_start + timedelta(hours=18))

        while cursor <= end_limit:
            bucket_end = cursor + timedelta(minutes=15)
            count = 0
            for record in queryset:
                checked_in = timezone.localtime(record.checked_in_at)
                checked_out = (
                    timezone.localtime(record.checked_out_at) if record.checked_out_at else now
                )
                if checked_in <= bucket_end and checked_out >= cursor:
                    count += 1
            buckets.append(
                {
                    "time": cursor.strftime("%H:%M"),
                    "count": count,
                }
            )
            cursor = bucket_end

        return Response(buckets)
