from __future__ import annotations

from django.db.models import Q
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from companies.models import Company
from integrations.models import IntegrationConnection, IntegrationEvent
from integrations.serializers import IntegrationConnectionSerializer, IntegrationEventSerializer


class IntegrationQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def _company(self) -> Company | None:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return None
        return Company.objects.filter(slug=company_slug, is_active=True).first()


class IntegrationConnectionListCreateView(IntegrationQuerysetMixin, ListCreateAPIView):
    serializer_class = IntegrationConnectionSerializer

    def get_queryset(self):
        company = self._company()
        if company is None:
            return IntegrationConnection.objects.none()
        return IntegrationConnection.objects.filter(company=company).order_by("provider", "name")

    def perform_create(self, serializer):
        company = self._company()
        if company is None:
            raise ValueError("Company context is required.")
        serializer.save(company=company)


class IntegrationConnectionDetailView(IntegrationQuerysetMixin, RetrieveUpdateDestroyAPIView):
    serializer_class = IntegrationConnectionSerializer
    lookup_url_kwarg = "connection_id"

    def get_queryset(self):
        company = self._company()
        if company is None:
            return IntegrationConnection.objects.none()
        return IntegrationConnection.objects.filter(company=company)


class IntegrationEventListView(IntegrationQuerysetMixin, ListCreateAPIView):
    serializer_class = IntegrationEventSerializer

    def get_queryset(self):
        company = self._company()
        if company is None:
            return IntegrationEvent.objects.none()
        queryset = IntegrationEvent.objects.filter(company=company)
        provider = self.request.query_params.get("provider", "").strip()
        if provider:
            queryset = queryset.filter(provider=provider)
        status = self.request.query_params.get("status", "").strip()
        if status:
            queryset = queryset.filter(status=status)
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(event_type__icontains=search)
                | Q(provider__icontains=search)
                | Q(error__icontains=search)
            )
        return queryset.order_by("-created_at", "-id")


class IntegrationWebhookView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def post(self, request, provider: str):
        company_slug = resolve_company_slug(request, required=True)
        if not company_slug:
            return Response({"detail": "Company not found."}, status=404)

        company = Company.objects.filter(slug=company_slug, is_active=True).first()
        if company is None:
            return Response({"detail": "Company not found."}, status=404)

        connection = IntegrationConnection.objects.filter(company=company, provider=provider).first()
        event = IntegrationEvent.objects.create(
            company=company,
            connection=connection,
            provider=provider,
            direction=IntegrationEvent.Direction.INBOUND,
            event_type=request.data.get("event_type") or "webhook.received",
            payload=request.data if isinstance(request.data, dict) else {},
            external_key=str(request.data.get("external_key") or ""),
            received_at=timezone.now(),
        )
        return Response({"id": event.id, "status": event.status}, status=201)
