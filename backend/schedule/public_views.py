from __future__ import annotations

from datetime import date, timedelta

from django.db.models import QuerySet
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from companies.models import Company
from schedule.group_serializers import PublicSchedulePayloadSerializer
from schedule.services import get_schedule_settings
from schedule.models import GroupScheduleSlot


class PublicScheduleEmbedView(APIView):
    """Публичное расписание для виджета на сайте клуба."""

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request: Request, company_slug: str) -> Response:
        company = Company.objects.filter(slug=company_slug, is_active=True).first()
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)

        settings = get_schedule_settings(company)
        if not settings.is_published:
            return Response({"detail": "Расписание не опубликовано."}, status=403)

        token = request.query_params.get("token", "")
        if settings.embed_token and token != settings.embed_token:
            return Response({"detail": "Неверный токен доступа."}, status=403)

        weeks_ahead = max(1, min(settings.publish_weeks_ahead or 4, 12))
        start = date.today()
        end = start + timedelta(weeks=weeks_ahead)

        slots: QuerySet[GroupScheduleSlot] = (
            GroupScheduleSlot.objects.filter(
                company=company,
                is_active=True,
                session_date__gte=start,
                session_date__lte=end,
            )
            .select_related("program", "trainer")
            .order_by("session_date", "start_time")
        )

        payload = {
            "company_name": company.name,
            "company_slug": company.slug,
            "weeks_ahead": weeks_ahead,
            "date_from": start.isoformat(),
            "date_to": end.isoformat(),
            "slots": slots,
        }
        return Response(PublicSchedulePayloadSerializer(payload).data)
