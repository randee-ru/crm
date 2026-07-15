from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

from django.utils import timezone

from clients.models import Client
from companies.models import Company
from crm.models import Deal, Task
from messaging.models import ChatMessage
from notifications.models import Notification
from notifications.services import create_notification
from notifications.telegram import send_telegram_notification
from telephony.lead_deals_service import find_open_lead_deal_for_phone
from telephony.models import CallLog
from telephony.phone import normalize_phone
from telephony.services import build_client_phone_index, resolve_client


def format_phone_display(phone: str) -> str:
    digits = normalize_phone(phone)
    if len(digits) == 11 and digits.startswith("7"):
        return f"+7 ({digits[1:4]}) {digits[4:7]}-{digits[7:9]}-{digits[9:11]}"
    return phone or "Неизвестный номер"


def _dedupe_exists(company: Company, source_object_id: str, *, minutes: int = 10) -> bool:
    if not source_object_id:
        return False
    cutoff = timezone.now() - timedelta(minutes=minutes)
    return Notification.objects.filter(
        company=company,
        source_object_id=source_object_id,
        created_at__gte=cutoff,
    ).exists()


def _call_target_url(company: Company, *, client: Client | None, phone: str, call_id: int | None = None) -> str:
    if client is not None:
        return f"/dashboard/clients/{client.id}"
    deal = find_open_lead_deal_for_phone(company, phone)
    if deal is not None:
        return f"/dashboard?deal={deal.id}"
    if call_id:
        return f"/dashboard/telephony?call={call_id}"
    return "/dashboard/telephony"


def _call_payload(
    *,
    event: str,
    caller_phone: str,
    line_name: str = "",
    client: Client | None = None,
    call_id: int | None = None,
    entry_id: str = "",
    duration: int = 0,
) -> dict[str, Any]:
    return {
        "event": event,
        "caller_phone": caller_phone,
        "line_name": line_name,
        "client_id": client.id if client else None,
        "client_name": client.full_name if client else "",
        "call_id": call_id,
        "entry_id": entry_id,
        "duration": duration,
    }


def resolve_client_by_phone(company: Company, phone: str) -> Client | None:
    index = build_client_phone_index(company)
    return resolve_client(index, phone)


def notify_call_ringing(
    company: Company,
    *,
    caller_phone: str,
    line_name: str = "",
    entry_id: str = "",
    client: Client | None = None,
) -> Notification | None:
    normalized = normalize_phone(caller_phone)
    dedupe_key = f"call:ringing:{entry_id or normalized}"
    if _dedupe_exists(company, dedupe_key, minutes=3):
        return None

    if client is None and normalized:
        client = resolve_client_by_phone(company, normalized)

    display_name = client.full_name if client else format_phone_display(normalized or caller_phone)
    line_label = line_name or "Ресепшен"

    phone_display = format_phone_display(normalized or caller_phone)
    telegram_lines = ["📲 Звонит клиент", company.name]
    if client:
        telegram_lines.append(client.full_name)
    else:
        telegram_lines.append("Неизвестный номер (нет в базе клиентов)")
    telegram_lines.append(phone_display)
    telegram_lines.append(line_label)
    send_telegram_notification("\n".join(telegram_lines))

    return create_notification(
        company=company,
        kind=Notification.Kind.CRM,
        title="Входящий звонок",
        body=f"{display_name} · {line_label}",
        target_url=_call_target_url(company, client=client, phone=normalized or caller_phone),
        source_app="telephony",
        source_model="CallLog",
        source_object_id=dedupe_key,
        payload=_call_payload(
            event="call.ringing",
            caller_phone=normalized or caller_phone,
            line_name=line_label,
            client=client,
            entry_id=entry_id,
        ),
    )


def notify_call_logged(call: CallLog) -> Notification | None:
    if call.direction != CallLog.Direction.INCOMING:
        return None

    dedupe_key = f"call:logged:{call.pk}"
    if _dedupe_exists(call.company, dedupe_key, minutes=30):
        return None

    client = call.client
    phone = call.caller_phone or call.from_number
    if client is None and phone:
        client = resolve_client_by_phone(call.company, phone)

    if call.status == CallLog.Status.ANSWERED and call.duration > 0:
        event = "call.answered"
        title = "Звонок принят"
        body = f"{client.full_name if client else format_phone_display(phone)} · {call.duration // 60}:{call.duration % 60:02d}"
    elif call.status == CallLog.Status.MISSED:
        event = "call.missed"
        title = "Пропущенный звонок"
        body = f"{client.full_name if client else format_phone_display(phone)} · {call.line_name or 'Телефония'}"
    else:
        event = "call.incoming"
        title = "Входящий звонок"
        body = f"{client.full_name if client else format_phone_display(phone)} · {call.line_name or 'Телефония'}"

    return create_notification(
        company=call.company,
        kind=Notification.Kind.CRM,
        title=title,
        body=body,
        target_url=_call_target_url(call.company, client=client, phone=phone, call_id=call.pk),
        source_app="telephony",
        source_model="CallLog",
        source_object_id=dedupe_key,
        payload=_call_payload(
            event=event,
            caller_phone=phone,
            line_name=call.line_name,
            client=client,
            call_id=call.pk,
            duration=call.duration,
        ),
    )


def notify_call_telegram(call: CallLog) -> None:
    direction_label = "Входящий" if call.direction == CallLog.Direction.INCOMING else "Исходящий"
    status_labels = {
        CallLog.Status.ANSWERED: "отвечен",
        CallLog.Status.MISSED: "пропущен",
    }
    status_label = status_labels.get(call.status, call.status)
    caller = format_phone_display(call.caller_phone or call.from_number)
    target = format_phone_display(call.target_phone or call.to_number)
    duration_label = f"{call.duration // 60}:{call.duration % 60:02d}"

    lines = [
        f"📞 {direction_label} звонок · {status_label}",
        call.company.name,
        f"{caller} → {target}",
    ]
    if call.client_id:
        lines.append(f"Клиент: {call.client.full_name}")
    if call.line_name:
        lines.append(f"Линия: {call.line_name}")
    lines.append(f"Длительность: {duration_label}")

    send_telegram_notification("\n".join(lines))


def notify_chat_message(message: ChatMessage) -> Notification | None:
    room = message.room
    company = room.company
    dedupe_key = f"message:{message.pk}"
    if _dedupe_exists(company, dedupe_key, minutes=60):
        return None

    author_name = ""
    if message.author_id:
        author_name = message.author.get_full_name() or message.author.username

    preview = re.sub(r"\s+", " ", (message.body or "").strip())
    if len(preview) > 120:
        preview = f"{preview[:117]}..."

    return create_notification(
        company=company,
        kind=Notification.Kind.INFO,
        title=f"Сообщение · {room.title}",
        body=f"{author_name}: {preview}" if author_name else preview,
        target_url="/dashboard/messages",
        source_app="messaging",
        source_model="ChatMessage",
        source_object_id=dedupe_key,
        payload={
            "event": "message.new",
            "room_id": room.id,
            "room_title": room.title,
            "author_id": message.author_id,
            "author_name": author_name,
            "preview": preview,
        },
    )


def notify_task_created(task: Task) -> Notification | None:
    dedupe_key = f"task:{task.pk}"
    if _dedupe_exists(task.company, dedupe_key, minutes=60):
        return None

    assignee = ""
    if task.assigned_to_id:
        assignee = task.assigned_to.get_full_name() or task.assigned_to.username

    body_parts = [task.title]
    if assignee:
        body_parts.append(f"Ответственный: {assignee}")

    return create_notification(
        company=task.company,
        recipient=task.assigned_to,
        kind=Notification.Kind.TASK,
        title="Новая задача",
        body=" · ".join(body_parts),
        target_url="/dashboard/tasks",
        source_app="crm",
        source_model="Task",
        source_object_id=dedupe_key,
        payload={
            "event": "task.created",
            "task_id": task.pk,
            "task_title": task.title,
            "assigned_to_id": task.assigned_to_id,
        },
    )


def notify_deal_stage_changed(deal: Deal, *, from_stage_name: str, to_stage_name: str) -> Notification | None:
    dedupe_key = f"deal:stage:{deal.pk}:{to_stage_name}"
    if _dedupe_exists(deal.company, dedupe_key, minutes=5):
        return None

    client_label = deal.client.full_name if deal.client_id else (deal.contact_phone or deal.title)

    return create_notification(
        company=deal.company,
        kind=Notification.Kind.CRM,
        title="Сделка перемещена",
        body=f"{client_label}: {from_stage_name} → {to_stage_name}",
        target_url=f"/dashboard?deal={deal.id}",
        source_app="crm",
        source_model="Deal",
        source_object_id=dedupe_key,
        payload={
            "event": "deal.stage_changed",
            "deal_id": deal.pk,
            "from_stage": from_stage_name,
            "to_stage": to_stage_name,
            "client_id": deal.client_id,
            "client_name": deal.client.full_name if deal.client_id else "",
        },
    )
