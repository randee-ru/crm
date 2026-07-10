from __future__ import annotations

from datetime import datetime, timedelta

from django.db.models import DateField, OuterRef, Prefetch, Q, QuerySet, Subquery
from django.db.models.functions import Cast, Coalesce
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
from notifications.telegram import send_telegram_notification
from clients.serializers import (
    BranchOptionSerializer,
    ClientDetailSerializer,
    ClientListSerializer,
    ClientOptionSerializer,
    ClientWriteSerializer,
)
from clients.profile_serializers import ClientProfileSerializer
from core.pagination import ClientListPagination
from core.search import digits_only, normalize_search, split_search_terms
from memberships.models import Membership
from schedule.models import GroupSlotEnrollment


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
                Prefetch(
                    "group_slot_enrollments",
                    queryset=GroupSlotEnrollment.objects.select_related("slot__program", "slot__branch", "slot__trainer"),
                ),
            )
        )


def apply_client_search(queryset: QuerySet[Client], search: str) -> QuerySet[Client]:
    search, digits = normalize_search(search)
    if len(search) < 3:
        return queryset

    terms = split_search_terms(search) or [search]
    text_conditions = None
    for term in terms:
        term_conditions = (
            Q(first_name__icontains=term)
            | Q(last_name__icontains=term)
            | Q(middle_name__icontains=term)
            | Q(email__icontains=term)
            | Q(external_id__icontains=term)
            | Q(client_status_label__icontains=term)
            | Q(manager_name__icontains=term)
            | Q(lead_source__icontains=term)
            | Q(acquisition_channel__icontains=term)
            | Q(club_name__icontains=term)
            | Q(membership_name__icontains=term)
            | Q(membership_status__icontains=term)
            | Q(contract_ref__icontains=term)
            | Q(card_number__icontains=term)
            | Q(passport__icontains=term)
            | Q(notes__icontains=term)
        )
        text_conditions = term_conditions if text_conditions is None else text_conditions & term_conditions

    conditions = text_conditions
    if digits:
        queryset = queryset.annotate(phone_digits=digits_only("phone"))
        phone_condition = Q(phone_digits__icontains=digits)
        conditions = phone_condition if conditions is None else conditions | phone_condition

    return queryset.filter(conditions) if conditions is not None else queryset


class ClientListCreateView(ClientQuerysetMixin, ListCreateAPIView):
    """Список и создание клиентов компании."""

    pagination_class = ClientListPagination

    # Ключ из ?ordering= -> поля модели/аннотации для order_by.
    # "-" перед ключом разворачивает сортировку (соответствует конвенции DRF).
    ORDERING_FIELDS = {
        "name": ["last_name", "first_name"],
        "client_status": ["client_status"],
        "membership_title": ["membership_title_sort"],
        "birth_date": ["birth_date"],
        "membership_end": ["membership_end_sort"],
        "branch": ["branch__name"],
        "registration_date": ["registration_sort"],
        "path": ["client_status"],
    }

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ClientWriteSerializer
        return ClientListSerializer

    def get_queryset(self) -> QuerySet[Client]:
        latest_membership = Membership.objects.filter(client=OuterRef("pk")).order_by("-starts_at")
        queryset = self.get_company_clients_queryset().annotate(
            membership_title_sort=Subquery(latest_membership.values("title")[:1]),
            membership_end_sort=Subquery(latest_membership.values("ends_at")[:1]),
            registration_sort=Coalesce("registration_date", Cast("created_at", DateField())),
        )

        search = self.request.query_params.get("search", "").strip()
        queryset = apply_client_search(queryset, search)

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

        ordering_param = self.request.query_params.get("ordering", "").strip()
        descending = ordering_param.startswith("-")
        ordering_key = ordering_param[1:] if descending else ordering_param
        ordering_fields = self.ORDERING_FIELDS.get(ordering_key)
        if ordering_fields:
            prefix = "-" if descending else ""
            queryset = queryset.order_by(*(f"{prefix}{field}" for field in ordering_fields), "-created_at")
        else:
            queryset = queryset.order_by("-created_at")

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
        client = write_serializer.instance
        read_serializer = ClientListSerializer(
            client,
            context=self.get_serializer_context(),
        )
        headers = self.get_success_headers(read_serializer.data)
        send_telegram_notification(
            "🆕 Новый клиент\n"
            f"{client.company.name}\n"
            f"{client.full_name} · {client.phone}",
        )
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


class ClientOptionsView(ClientQuerysetMixin, ListAPIView):
    """Быстрый поиск клиентов для привязки к сделке."""

    serializer_class = ClientOptionSerializer
    pagination_class = ClientListPagination

    def get_queryset(self) -> QuerySet[Client]:
        queryset = (
            Client.objects.filter(
                company__slug=resolve_company_slug(self.request, required=True),
                company__is_active=True,
            )
            .only("id", "first_name", "last_name", "middle_name", "phone")
            .order_by("last_name", "first_name", "id")
        )

        search = self.request.query_params.get("search", "").strip()
        ids_raw = self.request.query_params.get("ids", "").strip()
        if ids_raw:
            ids = [int(value) for value in ids_raw.split(",") if value.isdigit()]
            if ids:
                return queryset.filter(id__in=ids)

        if len(search) < 2:
            return queryset.none()

        search, digits = normalize_search(search)
        terms = split_search_terms(search) or [search]
        text_conditions = None
        for term in terms:
            term_conditions = (
                Q(first_name__icontains=term)
                | Q(last_name__icontains=term)
                | Q(middle_name__icontains=term)
                | Q(email__icontains=term)
                | Q(external_id__icontains=term)
            )
            text_conditions = term_conditions if text_conditions is None else text_conditions & term_conditions

        conditions = text_conditions
        if digits:
            queryset = queryset.annotate(phone_digits=digits_only("phone"))
            phone_condition = Q(phone_digits__icontains=digits)
            conditions = phone_condition if conditions is None else conditions | phone_condition

        return queryset.filter(conditions) if conditions is not None else queryset


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
                "disabled_modules": company.effective_disabled_modules(membership.role),
            }
        )
