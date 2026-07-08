from __future__ import annotations

from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from schedule.public_access import PublicScheduleAccessMixin


class PublicScheduleEmbedView(PublicScheduleAccessMixin, APIView):
    """Публичное расписание для виджета на сайте клуба."""

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request: Request, company_slug: str) -> Response:
        company = self.get_company(company_slug)
        if company is None:
            return Response({"detail": "Компания не найдена."}, status=404)
        return self.build_schedule_response(company, request)
