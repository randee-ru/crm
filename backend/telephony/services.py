from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

from django.db import transaction
from django.utils import timezone

from clients.models import Client
from companies.models import Company
from telephony.lead_deals_service import ensure_lead_deal_from_call
from telephony.lines import fetch_mango_line_directory, resolve_mango_call_line_name
from telephony.mango_client import (
    MangoCall,
    MangoConfig,
    MangoRateLimitError,
    determine_call_direction,
    get_mango_calls,
    is_mango_rate_limit_error,
    resolve_mango_config,
)
from telephony.phone import phone_tail
from telephony.models import CallLog, TelephonyIntegration
from telephony.recording_jobs import enqueue_call_recording_archives
from telephony.recording_storage import purge_old_recordings
from telephony.phone import normalize_phone, phone_tail


logger = logging.getLogger(__name__)
MANGO_SYNC_COOLDOWN_KEY = "mango_sync_cooldown_until"
MANGO_SYNC_DEFAULT_COOLDOWN_SECONDS = 30 * 60
MANGO_SYNC_MAX_COOLDOWN_SECONDS = 24 * 60 * 60


def build_client_phone_index(company: Company) -> dict[str, Client]:
    index: dict[str, Client] = {}
    for client in Client.objects.filter(company=company).only("id", "phone", "first_name", "last_name", "middle_name"):
        key = normalize_phone(client.phone)
        if key:
            index[key] = client
        tail = phone_tail(client.phone)
        if tail:
            index.setdefault(tail, client)
    return index


def resolve_client(index: dict[str, Client], *phones: str) -> Client | None:
    for phone in phones:
        key = normalize_phone(phone)
        if key and key in index:
            return index[key]
        tail = phone_tail(phone)
        if tail and tail in index:
            return index[tail]
    return None


def resolve_line_name(call: MangoCall, existing_line_name: str = "", line_directory: dict | None = None) -> str:
    return resolve_mango_call_line_name(call, line_directory=line_directory, existing_line_name=existing_line_name)


def _mango_sync_cooldown_until(integration: TelephonyIntegration) -> datetime | None:
    settings_data = integration.settings if isinstance(integration.settings, dict) else {}
    raw_value = settings_data.get(MANGO_SYNC_COOLDOWN_KEY)
    if not isinstance(raw_value, str) or not raw_value.strip():
        return None

    try:
        cooldown_until = datetime.fromisoformat(raw_value)
    except ValueError:
        return None

    if cooldown_until.tzinfo is None:
        cooldown_until = timezone.make_aware(cooldown_until, timezone.get_current_timezone())
    return cooldown_until


def _mango_sync_rate_limited(integration: TelephonyIntegration) -> bool:
    cooldown_until = _mango_sync_cooldown_until(integration)
    return bool(cooldown_until and cooldown_until > timezone.now())


def _set_mango_sync_cooldown(integration: TelephonyIntegration, retry_after_seconds: int | None = None) -> datetime:
    retry_after = retry_after_seconds if retry_after_seconds is not None else MANGO_SYNC_DEFAULT_COOLDOWN_SECONDS
    retry_after = max(60, min(retry_after, MANGO_SYNC_MAX_COOLDOWN_SECONDS))
    cooldown_until = timezone.now() + timedelta(seconds=retry_after)
    settings_data = dict(integration.settings or {})
    settings_data[MANGO_SYNC_COOLDOWN_KEY] = cooldown_until.isoformat()
    integration.settings = settings_data
    integration.save(update_fields=["settings", "updated_at"])
    return cooldown_until


def build_external_id(call: MangoCall) -> str:
    if call.recording_id:
        return f"mango_{call.recording_id}_{call.start}_{call.finish}"
    return f"mango_{call.start}_{call.finish}_{normalize_phone(call.from_number)}_{normalize_phone(call.to_number)}"


def upsert_mango_call(
    company: Company,
    call: MangoCall,
    client_index: dict[str, Client],
    existing: CallLog | None = None,
    line_directory: dict | None = None,
) -> tuple[CallLog, bool]:
    direction_raw = determine_call_direction(call.from_number, call.to_number)
    direction = CallLog.Direction.INCOMING if direction_raw == "incoming" else CallLog.Direction.OUTGOING
    source_number = call.from_number if direction_raw == "incoming" else call.to_number
    target_number = call.to_number if direction_raw == "incoming" else call.from_number
    caller_phone = normalize_phone(source_number)
    target_phone = normalize_phone(target_number) or caller_phone
    duration = max(0, int(call.finish - call.start))
    status = CallLog.Status.MISSED if duration <= 0 else CallLog.Status.ANSWERED
    client = resolve_client(client_index, caller_phone, target_phone, call.line_number)
    line_name = resolve_line_name(call, existing.line_name if existing else "", line_directory)
    external_id = existing.external_id if existing and existing.external_id else build_external_id(call)
    started_at = datetime.fromtimestamp(call.start, tz=timezone.get_current_timezone())

    defaults = {
        "client": client,
        "direction": direction,
        "status": existing.status if existing and existing.status else status,
        "caller_phone": caller_phone,
        "target_phone": target_phone,
        "from_number": call.from_number[:64],
        "to_number": call.to_number[:64],
        "line_number": (call.line_number or "")[:64],
        "line_name": line_name[:120],
        "recording_id": (call.recording_id or (existing.recording_id if existing else ""))[:128],
        "started_at": started_at,
        "duration": duration,
        "source": line_name[:120],
        "transcription_text": existing.transcription_text if existing else "",
        "call_report": existing.call_report if existing else "",
        "call_summary": existing.call_summary if existing else "",
        "recording_url": existing.recording_url if existing else "",
    }

    call_log, created = CallLog.objects.update_or_create(
        company=company,
        external_id=external_id,
        defaults=defaults,
    )
    if created or call_log.client_id is None:
        ensure_lead_deal_from_call(call_log)
    return call_log, created


def _phones_match(lhs: str, rhs: str) -> bool:
    left = normalize_phone(lhs)
    right = normalize_phone(rhs)
    if left and right and left == right:
        return True
    left_tail = phone_tail(lhs)
    right_tail = phone_tail(rhs)
    return bool(left_tail and right_tail and left_tail == right_tail)


def _mango_call_matches_call_log(call: CallLog, mango_call: MangoCall) -> bool:
    call_start = int(call.started_at.timestamp())
    if abs(call_start - mango_call.start) > 2:
        return False
    mango_duration = max(0, int(mango_call.finish - mango_call.start))
    if mango_duration != call.duration:
        return False

    call_from = call.from_number or call.caller_phone
    call_to = call.to_number or call.target_phone
    if _phones_match(call_from, mango_call.from_number) and _phones_match(call_to, mango_call.to_number):
        return True
    return _phones_match(call_from, mango_call.to_number) and _phones_match(call_to, mango_call.from_number)


def refresh_call_recording_from_mango(call: CallLog, config: MangoConfig) -> str:
    if call.recording_id or call.recording_file:
        return call.recording_id

    call_date = timezone.localdate(call.started_at)
    try:
        mango_calls = get_mango_calls(config, call_date, call_date)
    except Exception as exc:
        if is_mango_rate_limit_error(exc):
            return ""
        raise
    for mango_call in mango_calls:
        if not mango_call.recording_id:
            continue
        if not _mango_call_matches_call_log(call, mango_call):
            continue
        call.recording_id = mango_call.recording_id[:128]
        call.save(update_fields=["recording_id", "updated_at"])
        return call.recording_id
    return ""


def recording_unavailable_message(call: CallLog) -> str:
    if call.status == CallLog.Status.ANSWERED and call.duration > 0:
        return "Запись не сохранялась в Mango Office"
    return "Запись пока недоступна"


def try_refresh_call_recording(call: CallLog) -> CallLog:
    if call.recording_id or call.recording_file:
        return call
    integration = TelephonyIntegration.objects.filter(company=call.company).first()
    if integration is None:
        return call
    if _mango_sync_rate_limited(integration):
        return call
    config = resolve_mango_config(integration)
    if config is None:
        return call
    try:
        refresh_call_recording_from_mango(call, config)
    except Exception as exc:
        logger.warning(
            "Failed to refresh call recording for company=%s call=%s: %s",
            call.company.slug,
            call.id,
            exc,
        )
        # Если Mango недоступен или вернул неожиданный ответ, не роняем UI записи.
        return call
    call.refresh_from_db()
    return call


@transaction.atomic
def sync_mango_calls(
    company: Company,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[int, TelephonyIntegration, int]:
    integration, _ = TelephonyIntegration.objects.get_or_create(company=company)
    config = resolve_mango_config(integration)
    if config is None:
        raise RuntimeError("Mango Office не настроен. Укажите API Key и API Salt в настройках телефонии.")

    if _mango_sync_rate_limited(integration):
        cooldown_until = _mango_sync_cooldown_until(integration)
        logger.warning(
            "Skipping Mango sync for company=%s until=%s because the previous request hit the rate limit",
            company.slug,
            cooldown_until,
        )
        return 0, integration, 0

    try:
        line_directory = fetch_mango_line_directory(config)
        integration.settings = {
            **(integration.settings or {}),
            "line_directory": line_directory,
        }
        integration.save(update_fields=["settings", "updated_at"])

        date_to = date_to or timezone.localdate()
        date_from = date_from or (date_to - timedelta(days=13))
        mango_calls = get_mango_calls(config, date_from, date_to)
    except Exception as exc:
        if not is_mango_rate_limit_error(exc):
            raise
        retry_after_seconds = exc.retry_after_seconds if isinstance(exc, MangoRateLimitError) else None
        cooldown_until = _set_mango_sync_cooldown(integration, retry_after_seconds)
        logger.warning(
            "Mango sync rate limited for company=%s until=%s",
            company.slug,
            cooldown_until,
        )
        return 0, integration, 0

    client_index = build_client_phone_index(company)

    existing_by_recording = {
        item.recording_id: item
        for item in CallLog.objects.filter(company=company).exclude(recording_id="")
    }
    existing_by_external = {
        item.external_id: item for item in CallLog.objects.filter(company=company).exclude(external_id="")
    }

    synced = 0
    new_call_ids: list[int] = []
    for mango_call in mango_calls:
        existing = None
        if mango_call.recording_id:
            existing = existing_by_recording.get(mango_call.recording_id)
        if existing is None:
            external_id = build_external_id(mango_call)
            existing = existing_by_external.get(external_id)
        call_log, created = upsert_mango_call(company, mango_call, client_index, existing, line_directory)
        if created and call_log.recording_id and not call_log.recording_file:
            new_call_ids.append(call_log.pk)
        synced += 1

    integration.provider = TelephonyIntegration.Provider.MANGO
    integration.last_synced_at = timezone.now()
    integration.save(update_fields=["provider", "last_synced_at", "updated_at"])

    if new_call_ids:
        transaction.on_commit(lambda ids=list(new_call_ids): enqueue_call_recording_archives(ids))

    purge_old_recordings(company)

    return synced, integration, len(new_call_ids)
