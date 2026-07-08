from __future__ import annotations

from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess
from clients.views import get_company_from_request
from crm.dashboard_services import (
    analytics_for_pipeline_slug,
    build_crm_dashboard_payload,
    fetch_kanban_stage_deals,
    serialize_kanban_deals,
)
from crm.models import DealPipeline


class CrmDashboardView(APIView):
    """Один ответ для CRM-канбана: воронки, сделки, сводка, филиалы."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get(self, request: Request) -> Response:
        company = get_company_from_request(request)
        if not company:
            return Response({"detail": "Компания не найдена."}, status=400)

        pipeline_raw = request.query_params.get("pipeline", "").strip()
        pipeline_id = int(pipeline_raw) if pipeline_raw.isdigit() else None

        per_stage_raw = request.query_params.get("per_stage", "15").strip()
        try:
            per_stage = max(1, min(int(per_stage_raw), 100))
        except ValueError:
            per_stage = 15

        search = request.query_params.get("search", "").strip()
        payload = build_crm_dashboard_payload(
            request=request,
            company=company,
            pipeline_id=pipeline_id,
            search=search,
            per_stage=per_stage,
        )
        return Response(payload)


class CrmFunnelAnalyticsView(APIView):
    """Полная аналитика воронки — по запросу (ленивая загрузка)."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get(self, request: Request) -> Response:
        company = get_company_from_request(request)
        if not company:
            return Response({"detail": "Компания не найдена."}, status=400)

        slug = request.query_params.get("pipeline_slug", "").strip()
        analytics = analytics_for_pipeline_slug(company, slug)
        if analytics is None:
            return Response({"detail": "Аналитика для этой воронки недоступна."}, status=404)
        return Response(analytics)
