from __future__ import annotations

from django.db.models import Count, Sum
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from crm.models import Deal
from crm.pipelines import RENEWAL_PIPELINE_SLUG, SALES_PIPELINE_SLUG, ensure_default_pipeline


class FunnelAnalyticsMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company(self):
        return get_company_from_request(self.request)


class SalesFunnelAnalyticsView(FunnelAnalyticsMixin, APIView):
    """Метрики воронки продажи абонемента."""

    def get(self, request) -> Response:
        company = self.get_company()
        if not company:
            return Response({"detail": "Компания не найдена."}, status=400)

        ensure_default_pipeline(company)
        deals = Deal.objects.filter(company=company, pipeline__slug=SALES_PIPELINE_SLUG).select_related("stage")

        by_stage = (
            deals.values("stage__code", "stage__name")
            .annotate(count=Count("id"), total_amount=Sum("amount"))
            .order_by("stage__code")
        )

        total = deals.count()
        won = deals.filter(stage__is_won=True).count()
        lost = deals.filter(stage__is_lost=True).count()
        open_deals = deals.filter(stage__is_won=False, stage__is_lost=False).count()

        return Response(
            {
                "pipeline_slug": SALES_PIPELINE_SLUG,
                "total_deals": total,
                "open_deals": open_deals,
                "won_deals": won,
                "lost_deals": lost,
                "conversion_rate": round(won / total * 100, 1) if total else 0,
                "stages": [
                    {
                        "code": row["stage__code"],
                        "name": row["stage__name"],
                        "count": row["count"],
                        "total_amount": str(row["total_amount"] or 0),
                    }
                    for row in by_stage
                ],
            }
        )


class RenewalFunnelAnalyticsView(FunnelAnalyticsMixin, APIView):
    """Метрики воронки продления абонемента."""

    def get(self, request) -> Response:
        company = self.get_company()
        if not company:
            return Response({"detail": "Компания не найдена."}, status=400)

        ensure_default_pipeline(company)
        deals = Deal.objects.filter(company=company, pipeline__slug=RENEWAL_PIPELINE_SLUG).select_related(
            "stage", "membership"
        )

        by_stage = (
            deals.values("stage__code", "stage__name")
            .annotate(count=Count("id"), total_amount=Sum("renewal_amount"))
            .order_by("stage__code")
        )

        total = deals.count()
        renewed = deals.filter(stage__is_won=True).count()
        not_renewed = deals.filter(stage__is_lost=True).count()
        open_deals = deals.filter(stage__is_won=False, stage__is_lost=False).count()

        overdue_count = deals.filter(
            stage__code="renewal_overdue",
            stage__is_won=False,
            stage__is_lost=False,
        ).count()

        return Response(
            {
                "pipeline_slug": RENEWAL_PIPELINE_SLUG,
                "total_deals": total,
                "open_deals": open_deals,
                "renewed_deals": renewed,
                "not_renewed_deals": not_renewed,
                "overdue_deals": overdue_count,
                "renewal_rate": round(renewed / total * 100, 1) if total else 0,
                "stages": [
                    {
                        "code": row["stage__code"],
                        "name": row["stage__name"],
                        "count": row["count"],
                        "total_amount": str(row["total_amount"] or 0),
                    }
                    for row in by_stage
                ],
            }
        )
