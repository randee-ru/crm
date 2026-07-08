from __future__ import annotations

import re

from telephony.lines import is_managers_line
from telephony.models import CallLog
from telephony.phone import normalize_phone


def should_create_lead_deal_from_call(call: CallLog) -> bool:
    """Входящий звонок без найденного клиента → новая заявка в CRM."""
    if call.direction != CallLog.Direction.INCOMING:
        return False
    return call.client_id is None


def build_lead_deal_title(call: CallLog) -> str:
    phone = call.caller_phone or call.from_number or "без номера"
    if is_managers_line(call.line_name):
        return f"Заявка — менеджеры ({phone})"
    return f"Заявка — звонок ({phone})"


def build_lead_deal_description(call: CallLog) -> str:
    line = call.line_name or call.source or "—"
    status = call.get_status_display()
    return (
        f"Автоматически из телефонии.\n"
        f"Линия: {line}\n"
        f"Статус: {status}\n"
        f"Длительность: {call.duration} с\n"
        f"Время: {call.started_at:%d.%m.%Y %H:%M}"
    )


def call_caller_phone(call: CallLog) -> str:
    return normalize_phone(call.caller_phone or call.from_number or "")


def extract_phone_from_lead_title(title: str) -> str:
    match = re.search(r"\(([^)]+)\)\s*$", title or "")
    if not match:
        return ""
    return normalize_phone(match.group(1))
