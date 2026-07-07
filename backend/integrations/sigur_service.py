from __future__ import annotations

import re
from typing import Any

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from attendance.models import AttendanceRecord
from clients.models import Client
from integrations.models import IntegrationConnection, IntegrationEvent
from memberships.models import Membership


def normalize_card_hex(value: str) -> str:
    cleaned = re.sub(r"[^0-9A-Fa-f]", "", value.strip())
    if not cleaned:
        return ""
    return cleaned.upper()


def find_client_by_card_hex(company_id: int, key_hex: str) -> Client | None:
    normalized = normalize_card_hex(key_hex)
    if not normalized:
        return None

    candidates = {normalized, normalized.lstrip("0") or "0"}
    query = Q()
    for candidate in candidates:
        query |= Q(card_number__iexact=candidate)
        query |= Q(card_number__iexact=f"0x{candidate}")
    return Client.objects.filter(company_id=company_id).filter(query).first()


def find_active_membership(client: Client) -> Membership | None:
    return (
        Membership.objects.filter(
            client=client,
            company_id=client.company_id,
            status=Membership.Status.ACTIVE,
        )
        .order_by("-ends_at")
        .first()
    )


def _parse_log_entry(entry: dict[str, Any]) -> dict[str, Any]:
    log_id = entry.get("logId")
    key_hex = str(entry.get("keyHex") or "")
    access_point = entry.get("accessPoint")
    direction = entry.get("direction")
    return {
        "log_id": log_id,
        "key_hex": key_hex,
        "access_point": access_point,
        "direction": direction,
        "external_key": f"sigur:{log_id}" if log_id is not None else "",
    }


@transaction.atomic
def process_sigur_events_payload(
    *,
    company_id: int,
    connection: IntegrationConnection | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    logs = payload.get("logs")
    if not isinstance(logs, list):
        raise ValueError("Ожидается поле logs (массив).")

    created_attendance = 0
    skipped = 0
    unknown_cards: list[str] = []
    confirmed_ids: list[str | int] = []

    for raw_entry in logs:
        if not isinstance(raw_entry, dict):
            skipped += 1
            continue

        entry = _parse_log_entry(raw_entry)
        log_id = entry["log_id"]
        if log_id is not None:
            confirmed_ids.append(log_id)

        IntegrationEvent.objects.create(
            company_id=company_id,
            connection=connection,
            provider=IntegrationConnection.Provider.SIGUR,
            direction=IntegrationEvent.Direction.INBOUND,
            event_type="sigur.passage",
            status=IntegrationEvent.Status.RECEIVED,
            payload=raw_entry,
            external_key=entry["external_key"],
            received_at=timezone.now(),
        )

        if entry["direction"] not in (1, "1"):
            skipped += 1
            continue

        if entry["external_key"] and AttendanceRecord.objects.filter(
            company_id=company_id,
            external_key=entry["external_key"],
        ).exists():
            skipped += 1
            continue

        client = find_client_by_card_hex(company_id, entry["key_hex"])
        if client is None:
            unknown_cards.append(entry["key_hex"])
            skipped += 1
            continue

        membership = find_active_membership(client)
        now = timezone.now()
        AttendanceRecord.objects.create(
            company_id=company_id,
            branch=client.branch,
            client=client,
            membership=membership,
            status=AttendanceRecord.Status.CHECKED_IN,
            checked_in_at=now,
            visit_source="sigur",
            room=str(entry["access_point"] or ""),
            external_key=entry["external_key"],
            notes=f"Sigur logId={log_id}, keyHex={entry['key_hex']}",
        )
        created_attendance += 1

        client.visit_count = (client.visit_count or 0) + 1
        client.last_visit_date = now.date()
        client.save(update_fields=["visit_count", "last_visit_date", "updated_at"])

    if connection is not None:
        connection.last_synced_at = timezone.now()
        connection.last_error = ""
        connection.save(update_fields=["last_synced_at", "last_error", "updated_at"])

    return {
        "confirmedLogId": confirmed_ids[-1] if len(confirmed_ids) == 1 else confirmed_ids,
        "processed": len(logs),
        "attendance_created": created_attendance,
        "skipped": skipped,
        "unknown_cards": unknown_cards,
    }


def verify_sigur_proxy_key(connection: IntegrationConnection | None, provided_key: str) -> bool:
    if connection is None or not provided_key:
        return False
    expected = str((connection.config or {}).get("proxy_inbound_key") or "").strip()
    if not expected:
        return False
    return expected == provided_key.strip()
