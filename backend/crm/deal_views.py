from __future__ import annotations

from django.db.models import Exists, OuterRef, Prefetch, Q, QuerySet
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from crm.dashboard_services import (
    fetch_kanban_deals,
    fetch_kanban_stage_deals,
    serialize_kanban_deals,
)
from crm.deal_serializers import (
    DealContactHistorySerializer,
    DealContactHistoryWriteSerializer,
    DealDetailSerializer,
    DealListSerializer,
    DealWriteSerializer,
)
from crm.models import Deal, DealContactHistory, DealStageHistory, Task
from crm.pipelines import ensure_default_pipeline
from core.pagination import DealListPagination
from notifications.telegram import send_telegram_notification


class DealQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_slug(self) -> str | None:
        return resolve_company_slug(self.request, required=True)

    def _annotate_overdue_tasks(self, queryset: QuerySet[Deal]) -> QuerySet[Deal]:
        overdue_tasks = Task.objects.filter(
            deal_id=OuterRef("pk"),
            status__in=[Task.Status.OPEN, Task.Status.IN_PROGRESS],
            due_at__lt=timezone.now(),
        )
        return queryset.annotate(has_overdue_task=Exists(overdue_tasks))

    def get_company_deals_light_queryset(self) -> QuerySet[Deal]:
        company_slug = self.get_company_slug()
        if not company_slug:
            return Deal.objects.none()

        queryset = (
            Deal.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related(
                "branch",
                "client",
                "assigned_to",
                "pipeline",
                "stage",
                "membership",
            )
            .order_by("-created_at")
        )
        return self._annotate_overdue_tasks(queryset)

    def get_company_deals_detail_queryset(self) -> QuerySet[Deal]:
        queryset = self.get_company_deals_light_queryset().prefetch_related(
            Prefetch(
                "stage_history",
                queryset=DealStageHistory.objects.select_related(
                    "from_stage",
                    "to_stage",
                    "changed_by",
                ).order_by("-created_at"),
            ),
            Prefetch(
                "contact_history",
                queryset=DealContactHistory.objects.select_related("user").order_by("-contacted_at"),
            ),
            Prefetch(
                "tasks",
                queryset=Task.objects.select_related("assigned_to", "created_by").order_by("-created_at"),
            ),
        )
        return queryset

    def get_company_deals_queryset(self) -> QuerySet[Deal]:
        return self.get_company_deals_light_queryset()


class DealKanbanView(DealQuerysetMixin, APIView):
    """Сделки для канбана: по N последних на этап или порция для одного этапа."""

    def get(self, request: Request) -> Response:
        company_slug = resolve_company_slug(request, required=True)
        if not company_slug:
            return Response([])

        company = get_company_from_request(request)
        if not company:
            return Response({"detail": "Компания не найдена."}, status=400)

        pipeline_id = request.query_params.get("pipeline", "").strip()
        if not pipeline_id.isdigit():
            return Response({"pipeline": "Укажите pipeline=id."}, status=400)

        per_stage_raw = request.query_params.get("per_stage", "15").strip()
        try:
            per_stage = max(1, min(int(per_stage_raw), 100))
        except ValueError:
            per_stage = 15

        stage_raw = request.query_params.get("stage", "").strip()
        offset_raw = request.query_params.get("offset", "0").strip()
        limit_raw = request.query_params.get("limit", "15").strip()

        from crm.models import DealPipeline

        try:
            pipeline = DealPipeline.objects.get(
                id=int(pipeline_id),
                company=company,
                is_active=True,
            )
        except DealPipeline.DoesNotExist:
            return Response({"pipeline": "Воронка не найдена."}, status=404)

        search = request.query_params.get("search", "").strip()
        ensure_default_pipeline(company)

        if stage_raw.isdigit():
            try:
                offset = max(0, int(offset_raw))
                limit = max(1, min(int(limit_raw), 50))
            except ValueError:
                offset, limit = 0, 15
            deals = fetch_kanban_stage_deals(
                company=company,
                pipeline=pipeline,
                stage_id=int(stage_raw),
                search=search,
                offset=offset,
                limit=limit,
            )
        else:
            deals = fetch_kanban_deals(
                company=company,
                pipeline=pipeline,
                search=search,
                per_stage=per_stage,
            )

        return Response(serialize_kanban_deals(deals, request=request, company=company))


class DealListCreateView(DealQuerysetMixin, ListCreateAPIView):
    pagination_class = DealListPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return DealWriteSerializer
        return DealListSerializer

    def get_queryset(self) -> QuerySet[Deal]:
        queryset = self.get_company_deals_queryset()

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
                | Q(client__phone__icontains=search)
                | Q(contact_name__icontains=search)
                | Q(contact_phone__icontains=search)
            )

        pipeline_id = self.request.query_params.get("pipeline", "").strip()
        if pipeline_id.isdigit():
            queryset = queryset.filter(pipeline_id=int(pipeline_id))

        stage_id = self.request.query_params.get("stage", "").strip()
        if stage_id.isdigit():
            queryset = queryset.filter(stage_id=int(stage_id))

        return queryset

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        company = get_company_from_request(self.request)
        if company:
            ensure_default_pipeline(company)
        context["company"] = company
        return context

    def perform_create(self, serializer) -> None:
        company = get_company_from_request(self.request)
        if company is None:
            raise ValueError("Company context is required.")
        serializer.save(company=company)

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = DealWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        deal = write_serializer.instance
        read_serializer = DealListSerializer(
            deal,
            context=self.get_serializer_context(),
        )
        headers = self.get_success_headers(read_serializer.data)
        client_label = deal.client.full_name if deal.client_id else (deal.contact_phone or deal.title)
        send_telegram_notification(
            "📈 Новый лид/сделка\n"
            f"{deal.company.name}\n"
            f"{deal.title} · {client_label}",
        )
        return Response(read_serializer.data, status=201, headers=headers)


class DealDetailView(DealQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "deal_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return DealWriteSerializer
        return DealDetailSerializer

    def get_queryset(self) -> QuerySet[Deal]:
        return self.get_company_deals_detail_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context


class DealContactListCreateView(DealQuerysetMixin, ListCreateAPIView):
    """Контакты и комментарии по сделке (DealContactHistory)."""

    def get_deal(self) -> Deal:
        company_slug = self.get_company_slug()
        if not company_slug:
            from rest_framework.exceptions import NotFound

            raise NotFound("Сделка не найдена.")

        deal = Deal.objects.filter(company__slug=company_slug, id=self.kwargs["deal_id"]).first()
        if deal is None:
            from rest_framework.exceptions import NotFound

            raise NotFound("Сделка не найдена.")
        return deal

    def get_queryset(self):
        from crm.models import DealContactHistory

        deal = self.get_deal()
        return DealContactHistory.objects.filter(deal=deal).select_related("user").order_by("-contacted_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return DealContactHistoryWriteSerializer
        return DealContactHistorySerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        context["deal"] = self.get_deal()
        return context

    def perform_create(self, serializer) -> None:
        serializer.save()
