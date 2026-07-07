from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from companies.models import Company
from telephony.models import CallLog, TelephonyIntegration
from telephony.phone import normalize_phone
from telephony.services import build_client_phone_index, resolve_client


class Command(BaseCommand):
    help = "Импорт настроек телефонии и звонков из JSON Randee (.randee/telephony/*.json)."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--file", required=True, help="Путь к telephony JSON")
        parser.add_argument("--company", default="sportmax", help="Slug компании")

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        file_path = Path(options["file"])
        if not file_path.exists():
            raise CommandError(f"Файл не найден: {file_path}")

        try:
            company = Company.objects.get(slug=options["company"], is_active=True)
        except Company.DoesNotExist as exc:
            raise CommandError(f"Компания '{options['company']}' не найдена.") from exc

        with file_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)

        integration, _ = TelephonyIntegration.objects.get_or_create(company=company)
        integration.provider = payload.get("provider") or TelephonyIntegration.Provider.MANGO
        integration.api_url = payload.get("apiUrl") or integration.api_url
        if payload.get("apiKey"):
            integration.api_key = payload["apiKey"]
        if payload.get("apiSecret"):
            integration.api_secret = payload["apiSecret"]
        if payload.get("webhookSecret"):
            integration.webhook_secret = payload["webhookSecret"]
        integration.settings = {
            "bitrix_webhook_url": payload.get("bitrixWebhookUrl") or "",
            "tracking_numbers": payload.get("trackingNumbers") or [],
        }
        if payload.get("lastSyncedAt"):
            try:
                integration.last_synced_at = datetime.fromisoformat(payload["lastSyncedAt"].replace("Z", "+00:00"))
            except ValueError:
                pass
        integration.save()

        client_index = build_client_phone_index(company)
        imported = 0
        for item in payload.get("calls") or []:
            caller_phone = normalize_phone(item.get("callerPhone") or item.get("fromNumber") or "")
            target_phone = normalize_phone(item.get("number") or item.get("toNumber") or "")
            client = resolve_client(
                client_index,
                caller_phone,
                target_phone,
                item.get("lineNumber") or "",
            )
            started_raw = item.get("startedAt")
            if not started_raw:
                continue
            started_at = datetime.fromisoformat(str(started_raw).replace("Z", "+00:00"))
            if timezone.is_naive(started_at):
                started_at = timezone.make_aware(started_at)

            external_id = str(item.get("id") or "").strip()
            if not external_id:
                continue

            direction = item.get("direction") or "incoming"
            if direction not in {CallLog.Direction.INCOMING, CallLog.Direction.OUTGOING}:
                direction = CallLog.Direction.INCOMING

            status = item.get("status") or CallLog.Status.ANSWERED
            if status not in dict(CallLog.Status.choices):
                status = CallLog.Status.ANSWERED

            CallLog.objects.update_or_create(
                company=company,
                external_id=external_id,
                defaults={
                    "client": client,
                    "direction": direction,
                    "status": status,
                    "caller_phone": caller_phone[:32],
                    "target_phone": target_phone[:32],
                    "from_number": str(item.get("fromNumber") or "")[:64],
                    "to_number": str(item.get("toNumber") or "")[:64],
                    "line_number": str(item.get("lineNumber") or "")[:64],
                    "line_name": str(item.get("lineName") or item.get("source") or "Mango Office")[:120],
                    "recording_id": str(item.get("recordingId") or "")[:128],
                    "recording_url": str(item.get("recordingUrl") or "")[:200],
                    "started_at": started_at,
                    "duration": int(item.get("duration") or 0),
                    "source": str(item.get("source") or item.get("lineName") or "")[:120],
                    "transcription_text": str(item.get("transcriptionText") or ""),
                    "call_report": str(item.get("callReport") or ""),
                },
            )
            imported += 1

        self.stdout.write(self.style.SUCCESS(f"Импортировано звонков: {imported}. Провайдер: {integration.provider}"))
