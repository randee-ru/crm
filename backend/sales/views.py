from __future__ import annotations

from django.db.models import Q, QuerySet
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from sales.models import Sale
from sales.serializers import SaleDetailSerializer, SaleListSerializer, SaleWriteSerializer


class SaleQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_sales_queryset(self) -> QuerySet[Sale]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return Sale.objects.none()

        return (
            Sale.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related("branch", "client", "membership", "trainer", "company")
            .order_by("-created_at")
        )


class SaleListCreateView(SaleQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return SaleWriteSerializer
        return SaleListSerializer

    def get_queryset(self) -> QuerySet[Sale]:
        queryset = self.get_company_sales_queryset()

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
                | Q(membership__title__icontains=search)
            )

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
        write_serializer = SaleWriteSerializer(data=request.data, context=self.get_serializer_context())
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        read_serializer = SaleListSerializer(write_serializer.instance, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=201, headers=headers)


class SaleDetailView(SaleQuerysetMixin, RetrieveUpdateAPIView):
    lookup_url_kwarg = "sale_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return SaleWriteSerializer
        return SaleDetailSerializer

    def get_queryset(self) -> QuerySet[Sale]:
        return self.get_company_sales_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context
