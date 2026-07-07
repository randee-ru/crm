from __future__ import annotations

from datetime import date as date_type, timedelta
from datetime import datetime
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone

from attendance.models import AttendanceRecord
from bookings.models import Booking
from clients.models import Client, ClientLead, ClientMessage
from companies.models import Company
from notifications.models import Notification
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


def parse_report_date(raw: str | None) -> date_type:
    if not raw:
        return timezone.localdate()

    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return timezone.localdate()


def build_daily_report(company: Company, report_date: date_type) -> dict:
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

    incoming_calls = calls.filter(direction=CallLog.Direction.INCOMING).count()
    outgoing_calls = calls.filter(direction=CallLog.Direction.OUTGOING).count()
    outgoing_dialed_base = calls.filter(direction=CallLog.Direction.OUTGOING, client__isnull=False).count()
    total_calls = calls.count()

    telegram_messages = messages.filter(_icontains_any("channel", "source", "kind", "body", terms=telegram_terms)).count()
    whatsapp_messages = messages.filter(_icontains_any("channel", "source", "kind", "body", terms=whatsapp_terms)).count()
    max_messages = messages.filter(_icontains_any("channel", "source", "kind", "body", terms=max_terms)).count()

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

    guest_visits = attendances.filter(Q(membership__isnull=True), Q(booking__isnull=True)).count()

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
    cash_op = payments.filter(status=Payment.Status.SUCCEEDED, method=Payment.Method.CASH).aggregate(total=Sum("amount"))["total"] or 0

    return {
        "report_date": report_date.isoformat(),
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
            "reviews": 0,
        },
        "source_notes": [
            "Телефония считается по журналу звонков.",
            "Мессенджеры считаются по сообщениям клиентов и текстовым маркерам канала.",
            "Заявки сайта считаются по лидам с признаками web/site/source/utm.",
            "Гостевые визиты считаются по посещениям без бронирования и абонемента.",
            "Касса ОП считается по успешным наличным платежам за день.",
        ],
        "plan_items": [
            "Подключить отдельный модуль отзывов и оценок, чтобы считать их автоматически.",
            "Нормализовать источники Telegram / WhatsApp / MAX на уровне интеграций.",
            "Добавить явный признак 'продление' в продажах, чтобы убрать эвристику.",
        ],
    }


def build_analytics_overview(company: Company, days: int = 30) -> dict:
    days = max(7, min(days, 90))
    today = timezone.localdate()
    start_date = today - timedelta(days=days - 1)

    clients_total = Client.objects.filter(company=company).count()
    clients_active = Client.objects.filter(company=company, is_active=True).count()
    unread_notifications = Notification.objects.filter(company=company, is_read=False).count()

    bookings = Booking.objects.filter(company=company, starts_at__date__gte=start_date)
    attendances = AttendanceRecord.objects.filter(company=company, checked_in_at__date__gte=start_date)
    sales = Sale.objects.filter(company=company, sold_at__date__gte=start_date)
    payments = Payment.objects.filter(company=company, paid_at__date__gte=start_date)

    sales_amount = sales.filter(status=Sale.Status.COMPLETED).aggregate(total=Sum("paid_amount"))["total"] or Decimal("0")
    payments_amount = payments.filter(status=Payment.Status.SUCCEEDED).aggregate(total=Sum("amount"))["total"] or Decimal("0")

    series = []
    for index in range(days):
        point_date = start_date + timedelta(days=index)
        series.append(
            {
                "date": point_date.isoformat(),
                "calls": CallLog.objects.filter(company=company, started_at__date=point_date).count(),
                "bookings": bookings.filter(starts_at__date=point_date).count(),
                "attendances": attendances.filter(checked_in_at__date=point_date).count(),
                "sales_amount": str(
                    sales.filter(status=Sale.Status.COMPLETED, sold_at__date=point_date).aggregate(
                        total=Sum("paid_amount")
                    )["total"]
                    or 0
                ),
                "payments_amount": str(
                    payments.filter(status=Payment.Status.SUCCEEDED, paid_at__date=point_date).aggregate(
                        total=Sum("amount")
                    )["total"]
                    or 0
                ),
            }
        )

    top_sources = list(
        ClientLead.objects.filter(company=company, lead_date__date__gte=start_date)
        .values("channel")
        .annotate(total=Count("id"))
        .order_by("-total", "channel")[:6]
    )

    return {
        "range": {
            "days": days,
            "start_date": start_date.isoformat(),
            "end_date": today.isoformat(),
        },
        "totals": {
            "clients_total": clients_total,
            "clients_active": clients_active,
            "bookings": bookings.count(),
            "attendances": attendances.count(),
            "sales_amount": str(sales_amount),
            "payments_amount": str(payments_amount),
            "unread_notifications": unread_notifications,
        },
        "series": series,
        "top_sources": top_sources,
    }
