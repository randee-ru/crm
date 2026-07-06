from __future__ import annotations

from datetime import date as date_type, datetime

from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess
from attendance.models import AttendanceRecord
from bookings.models import Booking
from clients.models import ClientLead, ClientMessage
from clients.views import get_company_from_request
from payments.models import Payment
from sales.models import Sale
from telephony.models import CallLog


def _icontains_any(*fields: str, terms: list[str]) -> Q:
    query = Q()
    for field in fields:
        for term in terms:
            query |= Q(**{f"{field}__icontains": term})
    return query


def _contains_any(text: str, terms: list[str]) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in terms)


def _parse_report_date(raw: str | None) -> date_type:
    if not raw:
        return timezone.localdate()

    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return timezone.localdate()


class DailyReportView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get(self, request):
        company = get_company_from_request(request)
        if company is None:
            return Response({"detail": "Company not found."}, status=404)

        report_date = _parse_report_date(request.query_params.get("date"))

        calls = CallLog.objects.filter(company=company, started_at__date=report_date)
        messages = ClientMessage.objects.filter(company=company, sent_at__date=report_date)
        leads = ClientLead.objects.filter(company=company, lead_date__date=report_date)
        attendances = AttendanceRecord.objects.filter(company=company, checked_in_at__date=report_date)
        bookings = Booking.objects.filter(company=company, starts_at__date=report_date)
        sales = Sale.objects.filter(company=company, sold_at__date=report_date)
        payments = Payment.objects.filter(company=company, paid_at__date=report_date)

        telegram_terms = ["telegram", "телеграм", "tg"]
        whatsapp_terms = ["whatsapp", "ватсап", "вацап", "whats app"]
        max_terms = ["max"]
        site_terms = ["site", "сайт", "web", "website", "landing", "форма", "form"]
        new_terms = ["new", "нов", "lead", "перв", "потенц"]
        refusal_terms = ["reject", "refus", "отказ", "cancel", "no-show", "неакту", "не подош"]
        renewal_terms = ["renew", "продлен", "продление", "продле", "extension"]
        guest_terms = ["guest", "гост", "guest pass", "гостевой"]

        incoming_calls = calls.filter(direction=CallLog.Direction.INCOMING).count()
        outgoing_calls = calls.filter(direction=CallLog.Direction.OUTGOING).count()
        outgoing_dialed_base = calls.filter(direction=CallLog.Direction.OUTGOING, client__isnull=False).count()
        total_calls = calls.count()

        telegram_messages = messages.filter(
            _icontains_any("channel", "source", "kind", "body", terms=telegram_terms)
        ).count()
        whatsapp_messages = messages.filter(
            _icontains_any("channel", "source", "kind", "body", terms=whatsapp_terms)
        ).count()
        max_messages = messages.filter(
            _icontains_any("channel", "source", "kind", "body", terms=max_terms)
        ).count()

        site_applications_q = _icontains_any(
            "channel",
            "title",
            "status",
            "club_name",
            "manager_name",
            "ad_source",
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_content",
            "utm_term",
            "comment",
            terms=site_terms,
        )
        site_applications = leads.filter(site_applications_q).count()
        new_site_applications = leads.filter(site_applications_q & _icontains_any("status", terms=new_terms)).count()

        guest_visits = attendances.filter(
            Q(membership__isnull=True),
            Q(booking__isnull=True),
        ).count()

        day_sales = sales.filter(status=Sale.Status.COMPLETED).count()
        day_sales_amount = sales.filter(status=Sale.Status.COMPLETED).aggregate(total=Sum("paid_amount"))["total"] or 0
        meetings_scheduled = bookings.filter(status__in=[Booking.Status.DRAFT, Booking.Status.CONFIRMED]).count()

        refusals = leads.filter(_icontains_any("status", "comment", "title", terms=refusal_terms)).count()
        renewals = 0
        for sale in sales.select_related("membership"):
            haystacks = [sale.title, sale.notes, sale.membership.title if sale.membership else ""]
            if any(_contains_any(text, renewal_terms) for text in haystacks):
                renewals += 1
        negative_result = sales.filter(status__in=[Sale.Status.CANCELLED, Sale.Status.REFUNDED]).count()
        no_result = calls.filter(status__in=[CallLog.Status.MISSED, CallLog.Status.BUSY, CallLog.Status.VOICEMAIL]).count()
        cash_op = payments.filter(
            status=Payment.Status.SUCCEEDED,
            method=Payment.Method.CASH,
        ).aggregate(total=Sum("amount"))["total"] or 0

        reviews = 0

        plan_items = [
            "Подключить отдельный модуль отзывов и оценок, чтобы считать их автоматически.",
            "Нормализовать источники Telegram / WhatsApp / MAX на уровне интеграций, а не только по тексту сообщений.",
            "Добавить явный признак 'продление' в продажах, чтобы убрать эвристику по названию.",
        ]

        source_notes = [
            "Телефония считается по журналу звонков.",
            "Мессенджеры считаются по сообщениям клиентов и текстовым маркерам канала.",
            "Заявки сайта считаются по лидам с признаками web/site/source/utm.",
            "Гостевые визиты считаются по посещениям без бронирования и абонемента.",
            "Касса ОП считается по успешным наличным платежам за день.",
        ]

        return Response(
            {
                "report_date": report_date.isoformat(),
                "generated_at": timezone.localtime().isoformat(),
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "slug": company.slug,
                },
                "metrics": {
                    "incoming_calls": incoming_calls,
                    "outgoing_calls": outgoing_calls,
                    "outgoing_dialed_base": outgoing_dialed_base,
                    "total_calls": total_calls,
                    "telegram": telegram_messages,
                    "max": max_messages,
                    "whatsapp": whatsapp_messages,
                    "site_applications": site_applications,
                    "new_site_applications": new_site_applications,
                    "guest_visits": guest_visits,
                    "day_sales": day_sales,
                    "day_sales_amount": str(day_sales_amount),
                    "meetings_scheduled": meetings_scheduled,
                    "refusals": refusals,
                    "renewals": renewals,
                    "negative_result": negative_result,
                    "no_result": no_result,
                    "cash_op": str(cash_op),
                    "reviews": reviews,
                },
                "source_notes": source_notes,
                "plan_items": plan_items,
            }
        )
