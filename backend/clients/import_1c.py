from __future__ import annotations

import hashlib
import re
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime


def parse_export_datetime(value: str | None) -> datetime | None:
    if not value or not str(value).strip():
        return None
    raw = str(value).strip()
    parsed = parse_datetime(raw)
    if parsed:
        return timezone.make_aware(parsed) if timezone.is_naive(parsed) else parsed
    parsed_date = parse_date(raw[:10])
    if parsed_date:
        return timezone.make_aware(datetime.combine(parsed_date, datetime.min.time()))
    return None


def parse_export_date(value: str | None) -> date | None:
    if not value or not str(value).strip():
        return None
    return parse_date(str(value).strip()[:10])


def normalize_phone(value: str | None, external_id: str) -> str:
    phone = re.sub(r"\s+", " ", (value or "").strip())
    if phone and phone != "-":
        return phone
    return f"import-{external_id[:12]}"


def split_name(record: dict) -> tuple[str, str, str]:
    name = (record.get("name") or "").strip()
    if name and name not in {"-", "—"}:
        parts = name.split()
        if len(parts) >= 3:
            return parts[1], parts[0], " ".join(parts[2:])
        if len(parts) == 2:
            return parts[1], parts[0], ""
        return parts[0], "-", ""

    first = (record.get("first_name") or "").strip()
    last = (record.get("last_name") or "").strip()
    middle = (record.get("second_name") or "").strip()
    if first in {"-", "—"}:
        first = ""
    if last in {"-", "—"}:
        last = ""
    if not first and not last:
        first, last = "Клиент", external_short(record.get("id", "x"))
    return first or "Клиент", last or "-", middle


def external_short(value: str) -> str:
    return str(value).replace("-", "")[:8]


def map_gender(value: str | None) -> str:
    raw = (value or "").strip().lower()
    if raw in {"male", "m", "мужской"}:
        return "male"
    if raw in {"female", "f", "женский"}:
        return "female"
    return "unknown"


def map_client_status(value: str | None) -> str:
    raw = (value or "lead").strip().lower()
    if raw in {"lead", "active", "former", "rejected"}:
        return raw
    return "lead"


def to_decimal(value: object) -> Decimal:
    if value in (None, ""):
        return Decimal("0")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def normalize_email(value: object) -> str:
    email = as_text(value, 254)
    if not email:
        return ""
    try:
        validate_email(email)
    except ValidationError:
        return ""
    return email


def as_text(value: object, max_len: int | None = None) -> str:
    if value is None or value is False:
        return ""
    if value is True:
        return "Да"
    text = str(value).strip()
    if text in {"-", "—"}:
        return ""
    if max_len is not None:
        return text[:max_len]
    return text


def make_key(*parts: object) -> str:
    raw = "|".join(str(part) for part in parts if part is not None)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def map_membership_status(value: str | None) -> str:
    raw = (value or "").strip().lower()
    mapping = {
        "active": "active",
        "активен": "active",
        "expired": "expired",
        "истёк": "expired",
        "истек": "expired",
        "cancelled": "cancelled",
        "отменён": "cancelled",
        "frozen": "frozen",
        "draft": "draft",
    }
    return mapping.get(raw, "active" if raw else "draft")


def map_booking_status(value: str | None) -> str:
    raw = (value or "").strip().lower()
    if raw in {"completed", "завершено", "проведено"}:
        return "completed"
    if raw in {"cancelled", "отменено"}:
        return "cancelled"
    if raw in {"no_show", "не пришёл", "не пришел"}:
        return "no_show"
    return "confirmed"


def default_membership_dates(start: date | None, end: date | None) -> tuple[date, date]:
    today = timezone.localdate()
    starts = start or today
    ends = end or (starts + timedelta(days=30))
    if ends < starts:
        ends = starts + timedelta(days=30)
    return starts, ends
