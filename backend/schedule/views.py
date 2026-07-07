from __future__ import annotations

from django.db.models import Q, QuerySet
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from schedule.models import ScheduleEvent
from schedule.serializers import (
    ScheduleEventDetailSerializer,
    ScheduleEventListSerializer,
    ScheduleEventWriteSerializer,
)


class ScheduleQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_schedule_queryset(self) -> QuerySet[ScheduleEvent]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return ScheduleEvent.objects.none()

        return (
            ScheduleEvent.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related("branch", "client", "trainer", "company")
            .order_by("starts_at")
        )


class ScheduleEventListCreateView(ScheduleQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return ScheduleEventWriteSerializer
        return ScheduleEventListSerializer

    def get_queryset(self) -> QuerySet[ScheduleEvent]:
        queryset = self.get_company_schedule_queryset()

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(trainer_name__icontains=search)
                | Q(trainer__first_name__icontains=search)
                | Q(trainer__last_name__icontains=search)
                | Q(room__icontains=search)
            )

        when = self.request.query_params.get("when", "").strip()
        now = timezone.now()
        if when == "today":
            queryset = queryset.filter(starts_at__date=now.date())
        elif when == "upcoming":
            queryset = queryset.filter(starts_at__gte=now)

        status = self.request.query_params.get("status", "").strip()
        if status:
            queryset = queryset.filter(status=status)

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
        write_serializer = ScheduleEventWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        read_serializer = ScheduleEventListSerializer(
            write_serializer.instance,
            context=self.get_serializer_context(),
        )
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=201, headers=headers)


class ScheduleEventDetailView(ScheduleQuerysetMixin, RetrieveUpdateAPIView):
    lookup_url_kwarg = "event_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return ScheduleEventWriteSerializer
        return ScheduleEventDetailSerializer

    def get_queryset(self) -> QuerySet[ScheduleEvent]:
        return self.get_company_schedule_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context
