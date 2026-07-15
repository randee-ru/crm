from __future__ import annotations

from datetime import date, timedelta

from django.conf import settings
from django.db.models import QuerySet
from rest_framework.request import Request
from rest_framework.response import Response

from clients.models import Client
from companies.models import Company
from schedule.client_auth import resolve_client_session
from schedule.group_serializers import PublicSchedulePayloadSerializer
from schedule.models import GroupScheduleSlot
from schedule.public_booking import build_slot_booking_meta
from schedule.services import get_schedule_settings


def get_public_schedule_payload(company: Company) -> tuple[date, date, int, int]:
    settings_obj = get_schedule_settings(company)
    weeks_ahead = max(1, min(settings_obj.publish_weeks_ahead or 4, 12))
    weeks_back = weeks_ahead
    today = date.today()
    start = today - timedelta(weeks=weeks_back)
    end = today + timedelta(weeks=weeks_ahead)
    return start, end, weeks_ahead, weeks_back


def _request_hostname(request: Request) -> str:
    forwarded = str(request.headers.get("X-Forwarded-Host") or "").split(",")[0].strip()
    host = forwarded or str(request.get_host() or "")
    return host.split(":")[0].strip().lower()


def is_public_schedule_host(request: Request) -> bool:
    host = _request_hostname(request)
    allowed = {h.strip().lower() for h in getattr(settings, "PUBLIC_SCHEDULE_HOSTS", []) if h.strip()}
    return bool(host) and host in allowed


class PublicScheduleAccessMixin:
    SESSION_HEADER = "HTTP_X_CLIENT_SESSION"

    def get_company(self, company_slug: str) -> Company | None:
        return Company.objects.filter(slug=company_slug, is_active=True).first()

    def ensure_published(self, company: Company, request: Request) -> Response | None:
        schedule_settings = get_schedule_settings(company)
        if not schedule_settings.is_published:
            return Response({"detail": "Расписание не опубликовано."}, status=403)

        # На хосте публичного расписания (schedule.sportmax.fit) токен в URL не нужен.
        if is_public_schedule_host(request):
            return None

        token = request.query_params.get("token", "")
        if schedule_settings.embed_token and token != schedule_settings.embed_token:
            return Response({"detail": "Неверный токен доступа."}, status=403)
        return None

    def get_client(self, request: Request, company: Company) -> Client | None:
        session_token = str(request.headers.get("X-Client-Session") or "").strip()
        if not session_token and self.SESSION_HEADER in request.META:
            session_token = str(request.META.get(self.SESSION_HEADER) or "").strip()
        return resolve_client_session(company, session_token)

    def build_schedule_response(self, company: Company, request: Request) -> Response:
        denied = self.ensure_published(company, request)
        if denied:
            return denied

        start, end, weeks_ahead, weeks_back = get_public_schedule_payload(company)
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
        slot_list = list(slots)
        client = self.get_client(request, company)
        booking_meta = build_slot_booking_meta(company, slot_list, client)

        payload = {
            "company_name": company.name,
            "company_slug": company.slug,
            "weeks_ahead": weeks_ahead,
            "weeks_back": weeks_back,
            "date_from": start.isoformat(),
            "date_to": end.isoformat(),
            "booking_enabled": True,
            "client": (
                {
                    "id": client.id,
                    "name": client.full_name,
                }
                if client
                else None
            ),
            "slots": slot_list,
        }
        serializer = PublicSchedulePayloadSerializer(
            payload,
            context={
                **booking_meta,
                "client": client,
            },
        )
        return Response(serializer.data)
