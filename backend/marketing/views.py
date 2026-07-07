from __future__ import annotations

from django.db.models import QuerySet
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from marketing.models import MarketingCampaign, MarketingIntegration
from marketing.serializers import (
    MarketingCampaignSerializer,
    MarketingCampaignWriteSerializer,
    MarketingIntegrationSerializer,
    MarketingIntegrationWriteSerializer,
)


class MarketingQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company(self):
        return get_company_from_request(self.request)

    def get_integrations_queryset(self) -> QuerySet[MarketingIntegration]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return MarketingIntegration.objects.none()
        return MarketingIntegration.objects.filter(
            company__slug=company_slug,
            company__is_active=True,
        ).select_related("connected_by", "company")

    def get_campaigns_queryset(self) -> QuerySet[MarketingCampaign]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return MarketingCampaign.objects.none()
        return MarketingCampaign.objects.filter(
            company__slug=company_slug,
            company__is_active=True,
        ).select_related("created_by", "company")


class MarketingIntegrationListCreateView(MarketingQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return MarketingIntegrationWriteSerializer
        return MarketingIntegrationSerializer

    def get_queryset(self) -> QuerySet[MarketingIntegration]:
        return self.get_integrations_queryset().order_by("provider")

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = MarketingIntegrationWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        integration = write_serializer.save()
        integration.last_synced_at = timezone.now()
        integration.save(update_fields=["last_synced_at", "updated_at"])
        read_serializer = MarketingIntegrationSerializer(integration, context=self.get_serializer_context())
        return Response(read_serializer.data, status=201)


class MarketingIntegrationDetailView(MarketingQuerysetMixin, RetrieveUpdateAPIView):
    lookup_url_kwarg = "integration_id"
    serializer_class = MarketingIntegrationSerializer

    def get_queryset(self) -> QuerySet[MarketingIntegration]:
        return self.get_integrations_queryset()

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return MarketingIntegrationWriteSerializer
        return MarketingIntegrationSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def perform_update(self, serializer) -> None:
        integration = serializer.save()
        integration.last_synced_at = timezone.now()
        integration.save(update_fields=["last_synced_at", "updated_at"])


class MarketingCampaignListCreateView(MarketingQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return MarketingCampaignWriteSerializer
        return MarketingCampaignSerializer

    def get_queryset(self) -> QuerySet[MarketingCampaign]:
        queryset = self.get_campaigns_queryset()
        channel = self.request.query_params.get("channel", "").strip()
        if channel:
            queryset = queryset.filter(channel=channel)
        status = self.request.query_params.get("status", "").strip()
        if status:
            queryset = queryset.filter(status=status)
        return queryset.order_by("-created_at")

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = MarketingCampaignWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        campaign = write_serializer.save()
        read_serializer = MarketingCampaignSerializer(campaign, context=self.get_serializer_context())
        return Response(read_serializer.data, status=201)


class MarketingCampaignDetailView(MarketingQuerysetMixin, RetrieveUpdateAPIView):
    lookup_url_kwarg = "campaign_id"

    def get_queryset(self) -> QuerySet[MarketingCampaign]:
        return self.get_campaigns_queryset()

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return MarketingCampaignWriteSerializer
        return MarketingCampaignSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context
