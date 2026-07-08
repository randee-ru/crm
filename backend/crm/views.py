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
from crm.models import Task
from crm.serializers import TaskDetailSerializer, TaskListSerializer, TaskWriteSerializer


class TaskQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_tasks_queryset(self) -> QuerySet[Task]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return Task.objects.none()

        return (
            Task.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related("branch", "client", "assigned_to", "created_by", "company", "deal")
            .order_by("due_at", "-created_at")
        )


class TaskListCreateView(TaskQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return TaskWriteSerializer
        return TaskListSerializer

    def get_queryset(self) -> QuerySet[Task]:
        queryset = self.get_company_tasks_queryset()

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        status = self.request.query_params.get("status", "").strip()
        if status:
            queryset = queryset.filter(status=status)

        due = self.request.query_params.get("due", "").strip()
        now = timezone.now()
        if due == "today":
            queryset = queryset.filter(due_at__date=now.date())
        elif due == "overdue":
            queryset = queryset.filter(due_at__lt=now).exclude(
                status__in=[Task.Status.DONE, Task.Status.CANCELLED]
            )

        deal_id = self.request.query_params.get("deal", "").strip()
        if deal_id.isdigit():
            queryset = queryset.filter(deal_id=int(deal_id))

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
        write_serializer = TaskWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        read_serializer = TaskListSerializer(
            write_serializer.instance,
            context=self.get_serializer_context(),
        )
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=201, headers=headers)


class TaskDetailView(TaskQuerysetMixin, RetrieveUpdateAPIView):
    lookup_url_kwarg = "task_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return TaskWriteSerializer
        return TaskDetailSerializer

    def get_queryset(self) -> QuerySet[Task]:
        return self.get_company_tasks_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context
