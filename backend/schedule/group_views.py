from __future__ import annotations

from datetime import date

from django.db.models import Count, Q, QuerySet
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from clients.views import get_company_from_request
from schedule.group_programs import ensure_default_group_programs
from schedule.group_serializers import (
    GroupProgramSerializer,
    GroupProgramWriteSerializer,
    GroupScheduleSlotSerializer,
    GroupScheduleSlotWriteSerializer,
    GroupSlotEnrollmentSerializer,
    GroupSlotEnrollmentWriteSerializer,
    ScheduleSettingsSerializer,
    ScheduleSettingsWriteSerializer,
    ScheduleSmsIntegrationSerializer,
    ScheduleSmsIntegrationWriteSerializer,
)
from schedule.models import (
    GroupProgram,
    GroupScheduleSlot,
    GroupSlotEnrollment,
    ScheduleSettings,
    ScheduleSmsIntegration,
)
from schedule.services import ensure_embed_token, get_schedule_settings
from schedule.views import ScheduleQuerysetMixin


class GroupProgramListView(ScheduleQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return GroupProgramWriteSerializer
        return GroupProgramSerializer

    def get_queryset(self) -> QuerySet[GroupProgram]:
        from accounts.permissions import resolve_company_slug

        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return GroupProgram.objects.none()
        if not GroupProgram.objects.filter(company__slug=company_slug, is_active=True).exists():
            company = get_company_from_request(self.request)
            if company is not None:
                ensure_default_group_programs(company)
        return GroupProgram.objects.filter(
            company__slug=company_slug,
            company__is_active=True,
            is_active=True,
        ).order_by("sort_order", "title")

    def get(self, request: Request, *args, **kwargs) -> Response:
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        company = get_company_from_request(self.request)
        context["company"] = company
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = GroupProgramWriteSerializer(data=request.data, context=self.get_serializer_context())
        write_serializer.is_valid(raise_exception=True)
        instance = write_serializer.save()
        return Response(GroupProgramSerializer(instance).data, status=status.HTTP_201_CREATED)


class GroupProgramDetailView(ScheduleQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "program_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return GroupProgramWriteSerializer
        return GroupProgramSerializer

    def get_queryset(self) -> QuerySet[GroupProgram]:
        from accounts.permissions import resolve_company_slug

        company_slug = resolve_company_slug(self.request, required=True)
        return GroupProgram.objects.filter(company__slug=company_slug, company__is_active=True)

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context

    def update(self, request: Request, *args, **kwargs) -> Response:
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        write_serializer = GroupProgramWriteSerializer(
            instance,
            data=request.data,
            partial=partial,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        instance = write_serializer.save()
        return Response(GroupProgramSerializer(instance).data)

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class GroupScheduleSlotListCreateView(ScheduleQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return GroupScheduleSlotWriteSerializer
        return GroupScheduleSlotSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        company = get_company_from_request(self.request)
        context["company"] = company
        if company is not None:
            context["schedule_settings"] = get_schedule_settings(company)
        return context

    def get_queryset(self) -> QuerySet[GroupScheduleSlot]:
        from accounts.permissions import resolve_company_slug

        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return GroupScheduleSlot.objects.none()
        queryset = GroupScheduleSlot.objects.filter(
            company__slug=company_slug,
            company__is_active=True,
            is_active=True,
        ).select_related("program", "trainer", "branch", "company__schedule_settings")
        queryset = queryset.annotate(
            enrollment_count_annotated=Count(
                "enrollments",
                filter=Q(
                    enrollments__status__in=[
                        GroupSlotEnrollment.Status.CONFIRMED,
                        GroupSlotEnrollment.Status.COMPLETED,
                    ]
                ),
            )
        )
        date_from = self.request.query_params.get("from")
        date_to = self.request.query_params.get("to")
        if date_from:
            queryset = queryset.filter(session_date__gte=date.fromisoformat(date_from))
        if date_to:
            queryset = queryset.filter(session_date__lte=date.fromisoformat(date_to))
        return queryset.order_by("session_date", "start_time")

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = GroupScheduleSlotWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        instance = write_serializer.save()
        read_serializer = GroupScheduleSlotSerializer(instance, context=self.get_serializer_context())
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class GroupScheduleSlotDetailView(ScheduleQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "slot_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return GroupScheduleSlotWriteSerializer
        return GroupScheduleSlotSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        company = get_company_from_request(self.request)
        context["company"] = company
        if company is not None:
            context["schedule_settings"] = get_schedule_settings(company)
        return context

    def get_queryset(self) -> QuerySet[GroupScheduleSlot]:
        from accounts.permissions import resolve_company_slug

        company_slug = resolve_company_slug(self.request, required=True)
        return (
            GroupScheduleSlot.objects.filter(
                company__slug=company_slug,
                company__is_active=True,
            )
            .select_related("program", "trainer", "branch", "company__schedule_settings")
            .annotate(
                enrollment_count_annotated=Count(
                "enrollments",
                filter=Q(
                    enrollments__status__in=[
                        GroupSlotEnrollment.Status.CONFIRMED,
                        GroupSlotEnrollment.Status.COMPLETED,
                    ]
                ),
            )
        )
        )

    def update(self, request: Request, *args, **kwargs) -> Response:
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        write_serializer = GroupScheduleSlotWriteSerializer(
            instance,
            data=request.data,
            partial=partial,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        instance = write_serializer.save()
        read_serializer = GroupScheduleSlotSerializer(instance, context=self.get_serializer_context())
        return Response(read_serializer.data)

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ScheduleSettingsView(ScheduleQuerysetMixin, APIView):
    def get(self, request: Request) -> Response:
        company = get_company_from_request(request)
        if company is None:
            return Response({"detail": "Company not found."}, status=404)
        settings = get_schedule_settings(company)
        if settings.is_published:
            ensure_embed_token(settings)
        return Response(ScheduleSettingsSerializer(settings).data)

    def patch(self, request: Request) -> Response:
        company = get_company_from_request(request)
        if company is None:
            return Response({"detail": "Company not found."}, status=404)
        settings = get_schedule_settings(company)
        serializer = ScheduleSettingsWriteSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if settings.is_published:
            ensure_embed_token(settings)
        return Response(ScheduleSettingsSerializer(settings).data)


class ScheduleSmsIntegrationListCreateView(ScheduleQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return ScheduleSmsIntegrationWriteSerializer
        return ScheduleSmsIntegrationSerializer

    def get_queryset(self) -> QuerySet[ScheduleSmsIntegration]:
        from accounts.permissions import resolve_company_slug

        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return ScheduleSmsIntegration.objects.none()
        return ScheduleSmsIntegration.objects.filter(
            company__slug=company_slug,
            company__is_active=True,
        ).order_by("-is_primary", "title", "id")

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = ScheduleSmsIntegrationWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        instance = write_serializer.save()
        if instance.is_primary:
            ScheduleSmsIntegration.objects.filter(company=instance.company).exclude(id=instance.id).update(
                is_primary=False
            )
        read_serializer = ScheduleSmsIntegrationSerializer(instance)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class ScheduleSmsIntegrationDetailView(ScheduleQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "integration_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return ScheduleSmsIntegrationWriteSerializer
        return ScheduleSmsIntegrationSerializer

    def get_queryset(self) -> QuerySet[ScheduleSmsIntegration]:
        from accounts.permissions import resolve_company_slug

        company_slug = resolve_company_slug(self.request, required=True)
        return ScheduleSmsIntegration.objects.filter(company__slug=company_slug, company__is_active=True)

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context

    def update(self, request: Request, *args, **kwargs) -> Response:
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        write_serializer = ScheduleSmsIntegrationWriteSerializer(
            instance,
            data=request.data,
            partial=partial,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        instance = write_serializer.save()
        if instance.is_primary:
            ScheduleSmsIntegration.objects.filter(company=instance.company).exclude(id=instance.id).update(
                is_primary=False
            )
        return Response(ScheduleSmsIntegrationSerializer(instance).data)

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GroupSlotEnrollmentListCreateView(ScheduleQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return GroupSlotEnrollmentWriteSerializer
        return GroupSlotEnrollmentSerializer

    def get_slot(self) -> GroupScheduleSlot | None:
        from accounts.permissions import resolve_company_slug

        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return None
        return GroupScheduleSlot.objects.filter(
            id=self.kwargs["slot_id"],
            company__slug=company_slug,
            company__is_active=True,
            is_active=True,
        ).first()

    def get_queryset(self) -> QuerySet[GroupSlotEnrollment]:
        slot = self.get_slot()
        if slot is None:
            return GroupSlotEnrollment.objects.none()
        return (
            GroupSlotEnrollment.objects.filter(slot=slot)
            .select_related("client")
            .order_by("-created_at")
        )

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        company = get_company_from_request(self.request)
        context["company"] = company
        slot = self.get_slot()
        if slot is not None:
            context["slot"] = slot
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        slot = self.get_slot()
        if slot is None:
            return Response({"detail": "Slot not found."}, status=404)
        write_serializer = GroupSlotEnrollmentWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        instance = write_serializer.save()
        read_serializer = GroupSlotEnrollmentSerializer(instance)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class GroupSlotEnrollmentDetailView(ScheduleQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "enrollment_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return GroupSlotEnrollmentWriteSerializer
        return GroupSlotEnrollmentSerializer

    def get_queryset(self) -> QuerySet[GroupSlotEnrollment]:
        from accounts.permissions import resolve_company_slug

        company_slug = resolve_company_slug(self.request, required=True)
        return GroupSlotEnrollment.objects.filter(
            slot_id=self.kwargs["slot_id"],
            company__slug=company_slug,
            company__is_active=True,
        ).select_related("client")

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context

    def update(self, request: Request, *args, **kwargs) -> Response:
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        write_serializer = GroupSlotEnrollmentWriteSerializer(
            instance,
            data=request.data,
            partial=partial,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        instance = write_serializer.save()
        return Response(GroupSlotEnrollmentSerializer(instance).data)
