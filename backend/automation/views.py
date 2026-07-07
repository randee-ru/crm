from __future__ import annotations

from django.db.models import Q
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from automation.models import AutomationEvent, AutomationRule
from automation.serializers import AutomationEventSerializer, AutomationRuleSerializer
from companies.models import Company


class AutomationQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def _company(self) -> Company | None:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return None
        return Company.objects.filter(slug=company_slug, is_active=True).first()


class AutomationRuleListCreateView(AutomationQuerysetMixin, ListCreateAPIView):
    serializer_class = AutomationRuleSerializer

    def get_queryset(self):
        company = self._company()
        if company is None:
            return AutomationRule.objects.none()
        return AutomationRule.objects.filter(company=company).order_by("sort_order", "id")

    def perform_create(self, serializer):
        company = self._company()
        if company is None:
            raise ValueError("Company context is required.")
        serializer.save(company=company)


class AutomationRuleDetailView(AutomationQuerysetMixin, RetrieveUpdateDestroyAPIView):
    serializer_class = AutomationRuleSerializer
    lookup_url_kwarg = "rule_id"

    def get_queryset(self):
        company = self._company()
        if company is None:
            return AutomationRule.objects.none()
        return AutomationRule.objects.filter(company=company)


class AutomationEventListView(AutomationQuerysetMixin, ListAPIView):
    serializer_class = AutomationEventSerializer

    def get_queryset(self):
        company = self._company()
        if company is None:
            return AutomationEvent.objects.none()

        queryset = AutomationEvent.objects.filter(company=company)
        event_type = self.request.query_params.get("event_type", "").strip()
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        status = self.request.query_params.get("status", "").strip()
        if status:
            queryset = queryset.filter(status=status)
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(event_type__icontains=search)
                | Q(source_app__icontains=search)
                | Q(source_model__icontains=search)
                | Q(error__icontains=search)
            )
        return queryset.order_by("-created_at", "-id")
