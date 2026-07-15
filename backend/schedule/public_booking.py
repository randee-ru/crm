from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

from django.db.models import Count
from django.utils import timezone

from clients.models import Client
from companies.models import Company
from schedule.models import GroupScheduleSlot, GroupSlotEnrollment, ScheduleSettings
from schedule.services import get_schedule_settings
from schedule.sms import SmsSendError, format_enrollment_confirmation_message, send_company_sms

logger = logging.getLogger(__name__)


BOOKING_DEADLINE_HOURS = 1


def _session_start_dt(slot: GroupScheduleSlot) -> datetime:
    session_start = datetime.combine(slot.session_date, slot.start_time)
    return timezone.make_aware(session_start, timezone.get_current_timezone())


def booking_deadline(slot: GroupScheduleSlot) -> datetime:
    return _session_start_dt(slot) - timedelta(hours=BOOKING_DEADLINE_HOURS)


ACTIVE_ENROLLMENT_STATUSES = [
    GroupSlotEnrollment.Status.CONFIRMED,
    GroupSlotEnrollment.Status.COMPLETED,
    GroupSlotEnrollment.Status.WAITLIST,
]


def slot_max_participants(slot: GroupScheduleSlot) -> int:
    if slot.max_participants:
        return slot.max_participants
    settings = getattr(slot.company, "schedule_settings", None)
    if settings is None:
        settings = get_schedule_settings(slot.company)
    return settings.default_max_participants


def occupied_count(slot: GroupScheduleSlot) -> int:
    return slot.enrollments.filter(
        status__in=[GroupSlotEnrollment.Status.CONFIRMED, GroupSlotEnrollment.Status.COMPLETED],
    ).count()


def build_slot_booking_meta(
    company: Company,
    slots: list[GroupScheduleSlot],
    client: Client | None = None,
) -> dict[str, object]:
    slot_ids = [slot.id for slot in slots]
    occupancy = {
        row["slot_id"]: row["total"]
        for row in GroupSlotEnrollment.objects.filter(
            slot_id__in=slot_ids,
            status__in=[GroupSlotEnrollment.Status.CONFIRMED, GroupSlotEnrollment.Status.COMPLETED],
        )
        .values("slot_id")
        .annotate(total=Count("id"))
    }
    enrolled_slot_ids: set[int] = set()
    enrollment_status_by_slot: dict[int, str] = {}
    enrollment_id_by_slot: dict[int, int] = {}
    if client is not None:
        rows = GroupSlotEnrollment.objects.filter(
            client=client,
            slot_id__in=slot_ids,
            status__in=ACTIVE_ENROLLMENT_STATUSES,
        ).values("id", "slot_id", "status")
        for row in rows:
            enrolled_slot_ids.add(row["slot_id"])
            enrollment_status_by_slot[row["slot_id"]] = row["status"]
            enrollment_id_by_slot[row["slot_id"]] = row["id"]
    settings = get_schedule_settings(company)
    return {
        "occupancy": occupancy,
        "default_max": settings.default_max_participants,
        "client_enrolled_slot_ids": enrolled_slot_ids,
        "client_enrollment_status_by_slot": enrollment_status_by_slot,
        "client_enrollment_id_by_slot": enrollment_id_by_slot,
    }


def create_public_enrollment(*, slot: GroupScheduleSlot, client: Client) -> GroupSlotEnrollment:
    if client.club_access_blocked:
        raise ValueError("Доступ в клуб ограничен.")
    if client.group_programs_blocked:
        raise ValueError("Запись на групповые занятия недоступна.")

    now = timezone.localtime()
    session_start = _session_start_dt(slot)
    if now >= session_start:
        raise ValueError("Запись на занятие закрыта — занятие уже началось.")
    # Запись закрывается за 1 час до начала занятия.
    if now >= booking_deadline(slot):
        raise ValueError("Запись на занятие закрыта — осталось меньше 1 часа до начала.")

    existing_active = GroupSlotEnrollment.objects.filter(
        slot=slot,
        client=client,
        status__in=ACTIVE_ENROLLMENT_STATUSES,
    ).first()
    if existing_active:
        raise ValueError("Вы уже записаны на это занятие.")

    occupied = occupied_count(slot)
    max_participants = slot_max_participants(slot)
    status = GroupSlotEnrollment.Status.CONFIRMED
    if occupied >= max_participants:
        status = GroupSlotEnrollment.Status.WAITLIST

    # После отмены запись остаётся (unique slot+client) — реактивируем её.
    cancelled = GroupSlotEnrollment.objects.filter(
        slot=slot,
        client=client,
        status=GroupSlotEnrollment.Status.CANCELLED,
    ).first()
    if cancelled is not None:
        cancelled.status = status
        cancelled.notes = cancelled.notes or "Онлайн-запись"
        cancelled.save(update_fields=["status", "notes", "updated_at"])
        return cancelled

    return GroupSlotEnrollment.objects.create(
        company=slot.company,
        slot=slot,
        client=client,
        status=status,
        notes="Онлайн-запись",
    )


def send_enrollment_confirmation_sms(
    *,
    company: Company,
    client: Client,
    slot: GroupScheduleSlot,
    enrollment: GroupSlotEnrollment,
    user_ip: str = "",
) -> bool:
    """Подтверждение записи SMS опционально — при ошибке записи не ломаем."""
    message = format_enrollment_confirmation_message(
        company_name=company.name,
        class_title=slot.custom_title or slot.program.title,
        session_date=slot.session_date.isoformat(),
        start_time=slot.start_time.isoformat(),
        status=enrollment.status,
    )
    try:
        return send_company_sms(
            company,
            client.phone,
            message,
            user_ip=user_ip,
            client=client,
            purpose="enrollment",
        )
    except SmsSendError:
        # На проде без буквенного отправителя SMS часто падает — запись уже создана.
        logger.warning(
            "Enrollment SMS skipped for company=%s (SMS.ru unavailable or sender required)",
            company.slug,
        )
        return False


def cancel_public_enrollment(*, enrollment: GroupSlotEnrollment, client: Client) -> GroupSlotEnrollment:
    if enrollment.client_id != client.id:
        raise ValueError("Недостаточно прав для отмены записи.")
    if enrollment.status == GroupSlotEnrollment.Status.CANCELLED:
        return enrollment

    now = timezone.localtime()
    slot = enrollment.slot
    session_start = _session_start_dt(slot)

    # Отмена запрещена менее чем за 1 час до старта занятия.
    cancel_deadline = session_start - timedelta(hours=BOOKING_DEADLINE_HOURS)
    if now >= cancel_deadline:
        raise ValueError("Отменить запись можно не позднее чем за 1 час до начала занятия.")

    enrollment.status = GroupSlotEnrollment.Status.CANCELLED
    enrollment.save(update_fields=["status", "updated_at"])
    return enrollment
