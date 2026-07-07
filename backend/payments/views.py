from __future__ import annotations

from django.db.models import Q, QuerySet
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from payments.models import Payment
from payments.serializers import PaymentDetailSerializer, PaymentListSerializer, PaymentWriteSerializer


class PaymentQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_payments_queryset(self) -> QuerySet[Payment]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return Payment.objects.none()

        return (
            Payment.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related("branch", "client", "membership", "sale", "company")
            .order_by("-created_at")
        )


class PaymentListCreateView(PaymentQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return PaymentWriteSerializer
        return PaymentListSerializer

    def get_queryset(self) -> QuerySet[Payment]:
        queryset = self.get_company_payments_queryset()

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
                | Q(sale__title__icontains=search)
                | Q(external_id__icontains=search)
            )

        status = self.request.query_params.get("status", "").strip()
        if status:
            queryset = queryset.filter(status=status)

        method = self.request.query_params.get("method", "").strip()
        if method:
            queryset = queryset.filter(method=method)

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
        write_serializer = PaymentWriteSerializer(data=request.data, context=self.get_serializer_context())
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        read_serializer = PaymentListSerializer(write_serializer.instance, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=201, headers=headers)


class PaymentDetailView(PaymentQuerysetMixin, RetrieveUpdateAPIView):
    lookup_url_kwarg = "payment_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return PaymentWriteSerializer
        return PaymentDetailSerializer

    def get_queryset(self) -> QuerySet[Payment]:
        return self.get_company_payments_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context
