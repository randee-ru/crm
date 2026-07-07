from __future__ import annotations

from datetime import datetime, timedelta

from django.db.models import Q, QuerySet
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import (
    HasCompanyAccess,
    get_active_memberships,
    get_company_or_none,
    resolve_company_slug,
)
from branches.models import Branch
from clients.models import Client
from clients.serializers import (
    BranchOptionSerializer,
    ClientDetailSerializer,
    ClientListSerializer,
    ClientWriteSerializer,
)
from clients.profile_serializers import ClientProfileSerializer
from core.pagination import ClientListPagination
from memberships.models import Membership


def get_company_from_request(request: Request):
    company_slug = resolve_company_slug(request, required=True)
    if not company_slug:
        return None
    return get_company_or_none(company_slug)


class ClientQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_clients_queryset(self) -> QuerySet[Client]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return Client.objects.none()

        return (
            Client.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related("branch", "company")
            .prefetch_related("memberships")
        )

    def get_company_client_profile_queryset(self) -> QuerySet[Client]:
        return (
            self.get_company_clients_queryset()
            .prefetch_related(
                "messages",
                "leads",
                "attendance_records",
                "sales",
                "deals__stage",
                "bookings",
                "memberships",
                "call_logs",
            )
        )


class ClientListCreateView(ClientQuerysetMixin, ListCreateAPIView):
    """Список и создание клиентов компании."""

    pagination_class = ClientListPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ClientWriteSerializer
        return ClientListSerializer

    def get_queryset(self) -> QuerySet[Client]:
        queryset = self.get_company_clients_queryset().order_by("-created_at")

        search = self.request.query_params.get("search", "").strip()
        if len(search) >= 3:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(middle_name__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
                | Q(external_id__icontains=search)
            )

        client_status = self.request.query_params.get("client_status", "").strip()
        if client_status:
            queryset = queryset.filter(client_status=client_status)

        membership_status = self.request.query_params.get("membership_status", "").strip()
        if membership_status:
            queryset = queryset.filter(memberships__status=membership_status).distinct()

        is_active = self.request.query_params.get("is_active")
        if is_active in {"true", "false"}:
            queryset = queryset.filter(is_active=is_active == "true")

        birth_date_from = self.request.query_params.get("birth_date_from", "").strip()
        if birth_date_from:
            try:
                queryset = queryset.filter(birth_date__gte=datetime.strptime(birth_date_from, "%Y-%m-%d").date())
            except ValueError:
                pass

        birth_date_to = self.request.query_params.get("birth_date_to", "").strip()
        if birth_date_to:
            try:
                queryset = queryset.filter(birth_date__lte=datetime.strptime(birth_date_to, "%Y-%m-%d").date())
            except ValueError:
                pass

        birthday_month = self.request.query_params.get("birthday_month", "").strip()
        if birthday_month.isdigit():
            month = int(birthday_month)
            if 1 <= month <= 12:
                queryset = queryset.filter(birth_date__month=month)

        membership_expires_in_days = self.request.query_params.get("membership_expires_in_days", "").strip()
        if membership_expires_in_days.isdigit():
            days = int(membership_expires_in_days)
            if days >= 0:
                today = timezone.localdate()
                cutoff = today + timedelta(days=days)
                queryset = (
                    queryset.filter(
                        memberships__status=Membership.Status.ACTIVE,
                        memberships__ends_at__range=(today, cutoff),
                    )
                    .distinct()
                )

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
        write_serializer = ClientWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        read_serializer = ClientListSerializer(
            write_serializer.instance,
            context=self.get_serializer_context(),
        )
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=201, headers=headers)


class ClientDetailView(ClientQuerysetMixin, RetrieveUpdateAPIView):
    """Просмотр и редактирование клиента."""

    lookup_url_kwarg = "client_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return ClientWriteSerializer
        return ClientDetailSerializer

    def get_queryset(self) -> QuerySet[Client]:
        return self.get_company_clients_queryset()

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context


class ClientProfileView(ClientQuerysetMixin, RetrieveAPIView):
    """Полная карточка клиента с историей из 1С."""

    lookup_url_kwarg = "client_id"
    serializer_class = ClientProfileSerializer
    http_method_names = ["get", "head", "options"]

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        company = get_company_from_request(self.request)
        if company is not None:
            from telephony.models import TelephonyIntegration

            integration = TelephonyIntegration.objects.filter(company=company).first()
            if integration and isinstance(integration.settings, dict):
                context["line_directory"] = integration.settings.get("line_directory") or {}
        return context

    def get_queryset(self) -> QuerySet[Client]:
        return self.get_company_client_profile_queryset()


class BranchListView(ClientQuerysetMixin, ListAPIView):
    """Филиалы компании для форм клиента."""

    serializer_class = BranchOptionSerializer

    def get_queryset(self) -> QuerySet[Branch]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return Branch.objects.none()

        return Branch.objects.filter(company__slug=company_slug, is_active=True).order_by("name")


class CompanyContextView(APIView):
    """Tenant-контекст компании для авторизованного пользователя."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get(self, request: Request) -> Response:
        company_slug = resolve_company_slug(request, required=True)
        company = get_company_or_none(company_slug or "")
        if company is None:
            return Response({"detail": "Company not found."}, status=404)

        membership = get_active_memberships(request.user).get(company=company)

        return Response(
            {
                "id": company.id,
                "name": company.name,
                "slug": company.slug,
                "role": membership.role,
                "branch_name": membership.branch.name if membership.branch else None,
                "clients_count": company.clients.count(),
                "clients_active_count": company.clients.filter(is_active=True).count(),
                "disabled_modules": company.disabled_modules,
            }
        )
