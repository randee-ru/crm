from __future__ import annotations

from django.db.models import Q, QuerySet
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from contracts.models import Contract
from contracts.serializers import ContractListSerializer, ContractWriteSerializer


class ContractQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company_contracts_queryset(self) -> QuerySet[Contract]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return Contract.objects.none()
        return (
            Contract.objects.filter(company__slug=company_slug, company__is_active=True)
            .select_related("client", "branch", "membership", "company")
            .order_by("-contract_date", "-id")
        )

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = get_company_from_request(self.request)
        return context


class ContractListCreateView(ContractQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return ContractWriteSerializer
        return ContractListSerializer

    def get_queryset(self) -> QuerySet[Contract]:
        queryset = self.get_company_contracts_queryset()
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(number__icontains=search.replace(" ", ""))
                | Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
                | Q(template_name__icontains=search)
                | Q(membership_label__icontains=search)
            )

        signed = self.request.query_params.get("signed", "").strip()
        if signed == "1":
            queryset = queryset.filter(is_signed=True)
        elif signed == "0":
            queryset = queryset.filter(is_signed=False)

        return queryset

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = ContractWriteSerializer(data=request.data, context=self.get_serializer_context())
        write_serializer.is_valid(raise_exception=True)
        contract = write_serializer.save()
        read_serializer = ContractListSerializer(contract, context=self.get_serializer_context())
        return Response(read_serializer.data, status=201)


class ContractDetailView(ContractQuerysetMixin, RetrieveUpdateAPIView):
    lookup_url_kwarg = "contract_id"

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return ContractWriteSerializer
        return ContractListSerializer

    def get_queryset(self) -> QuerySet[Contract]:
        return self.get_company_contracts_queryset()
