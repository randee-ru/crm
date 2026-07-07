from __future__ import annotations

from django.db.models import Q, QuerySet
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from crm.deal_serializers import DealDetailSerializer, DealListSerializer, DealWriteSerializer
from crm.models import Deal
from crm.pipelines import ensure_default_pipeline


class DealQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_deals_queryset(self) -> QuerySet[Deal]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return Deal.objects.none()

        return (
            Deal.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related("branch", "client", "assigned_to", "company", "pipeline", "stage")
            .order_by("-created_at")
        )


class DealListCreateView(DealQuerysetMixin, ListCreateAPIView):
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
        read_serializer = DealListSerializer(
            write_serializer.instance,
            context=self.get_serializer_context(),
        )
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=201, headers=headers)


class DealDetailView(DealQuerysetMixin, RetrieveUpdateDestroyAPIView):
    lookup_url_kwarg = "deal_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return DealWriteSerializer
        return DealDetailSerializer

    def get_queryset(self) -> QuerySet[Deal]:
        return self.get_company_deals_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context
