from __future__ import annotations

from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess
from clients.views import get_company_from_request
from reports.services import build_analytics_overview, build_daily_report, parse_report_date


class DailyReportView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get(self, request):
        company = get_company_from_request(request)
        if company is None:
            return Response({"detail": "Company not found."}, status=404)

        report_date = parse_report_date(request.query_params.get("date"))
        report = build_daily_report(company, report_date)

        return Response(
            {
                "report_date": report["report_date"],
                "generated_at": timezone.localtime().isoformat(),
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "slug": company.slug,
                },
                "metrics": report["metrics"],
                "source_notes": report["source_notes"],
                "plan_items": report["plan_items"],
            }
        )


class AnalyticsOverviewView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get(self, request):
        company = get_company_from_request(request)
        if company is None:
            return Response({"detail": "Company not found."}, status=404)

        days = request.query_params.get("days")
        try:
            period = int(days) if days else 30
        except ValueError:
            period = 30

        return Response(
            {
                "generated_at": timezone.localtime().isoformat(),
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "slug": company.slug,
                },
                **build_analytics_overview(company, period),
            }
        )
