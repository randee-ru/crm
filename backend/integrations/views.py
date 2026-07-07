from __future__ import annotations

import secrets

from django.db.models import Q
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from companies.models import Company
from integrations.models import IntegrationConnection, IntegrationEvent
from integrations.serializers import IntegrationConnectionSerializer, IntegrationEventSerializer
from integrations.sigur_service import process_sigur_events_payload, verify_sigur_proxy_key


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
        extra: dict = {}
        if serializer.validated_data.get("provider") == IntegrationConnection.Provider.SIGUR:
            config = dict(serializer.validated_data.get("config") or {})
            if not str(config.get("proxy_inbound_key") or "").strip():
                config["proxy_inbound_key"] = secrets.token_urlsafe(24)
            extra["config"] = config
        serializer.save(company=company, **extra)


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


class SigurInboundEventsView(APIView):
    """Приём копии проходов от локального Sigur-прокси на сервере клуба."""

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request):
        company_slug = resolve_company_slug(request, required=True)
        if not company_slug:
            return Response({"detail": "Company not found."}, status=404)

        company = Company.objects.filter(slug=company_slug, is_active=True).first()
        if company is None:
            return Response({"detail": "Company not found."}, status=404)

        connection = (
            IntegrationConnection.objects.filter(
                company=company,
                provider=IntegrationConnection.Provider.SIGUR,
                status=IntegrationConnection.Status.ACTIVE,
            )
            .order_by("-updated_at")
            .first()
        )
        if connection is None:
            connection = IntegrationConnection.objects.filter(
                company=company,
                provider=IntegrationConnection.Provider.SIGUR,
            ).first()

        proxy_key = request.headers.get("X-Sigur-Proxy-Key", "")
        if not verify_sigur_proxy_key(connection, proxy_key):
            return Response({"detail": "Invalid proxy key."}, status=401)

        if not isinstance(request.data, dict):
            return Response({"detail": "Ожидается JSON-объект."}, status=400)

        try:
            result = process_sigur_events_payload(
                company_id=company.id,
                connection=connection,
                payload=request.data,
            )
        except ValueError as error:
            return Response({"detail": str(error)}, status=400)
        except Exception as error:  # noqa: BLE001
            if connection is not None:
                connection.last_error = str(error)
                connection.save(update_fields=["last_error", "updated_at"])
            return Response({"detail": "Не удалось обработать события Sigur."}, status=500)

        return Response(result, status=200)
