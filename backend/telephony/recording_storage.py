from __future__ import annotations

import mimetypes
import re
import time
from datetime import timedelta

from django.conf import settings
from django.core.files.base import ContentFile
from django.db.models import Q
from django.http import FileResponse
from django.utils import timezone

from companies.models import Company
from telephony.mango_client import download_mango_recording, resolve_mango_config
from telephony.models import CallLog, TelephonyIntegration


def recording_retention_days() -> int:
    return int(getattr(settings, "TELEPHONY_RECORDING_RETENTION_DAYS", 365))


def recording_extension(content_type: str) -> str:
    normalized = (content_type or "").lower()
    if "wav" in normalized:
        return "wav"
    if "ogg" in normalized:
        return "ogg"
    return "mp3"


def safe_recording_filename(recording_id: str, extension: str) -> str:
    safe_id = re.sub(r"[^A-Za-z0-9._-]+", "_", recording_id).strip("._")[:100]
    return f"{safe_id or 'recording'}.{extension}"


def archive_call_recording(call: CallLog, config=None) -> bool:
    if call.recording_file or not call.recording_id:
        return False

    if config is None:
        integration = TelephonyIntegration.objects.filter(company=call.company).first()
        config = resolve_mango_config(integration) if integration else None
    if config is None:
        raise RuntimeError("Mango Office не настроен.")

    data, content_type = download_mango_recording(config, call.recording_id, call.recording_url)
    if not data:
        return False

    filename = safe_recording_filename(call.recording_id, recording_extension(content_type))
    call.recording_file.save(filename, ContentFile(data), save=False)
    call.recording_archived_at = timezone.now()
    call.save(update_fields=["recording_file", "recording_archived_at", "updated_at"])
    return True


def archive_pending_recordings(
    company: Company,
    *,
    limit: int | None = None,
    days: int | None = None,
    sleep_on_rate_limit: float = 2.0,
) -> tuple[int, int]:
    integration = TelephonyIntegration.objects.filter(company=company).first()
    config = resolve_mango_config(integration) if integration else None
    if config is None:
        raise RuntimeError("Mango Office не настроен.")

    retention_days = days if days is not None else recording_retention_days()
    cutoff = timezone.now() - timedelta(days=retention_days)
    batch_limit = limit if limit is not None else int(getattr(settings, "TELEPHONY_RECORDING_ARCHIVE_LIMIT", 25))

    qs = (
        CallLog.objects.filter(company=company, started_at__gte=cutoff)
        .exclude(recording_id="")
        .filter(Q(recording_file="") | Q(recording_file__isnull=True))
        .order_by("-started_at")[:batch_limit]
    )

    archived = 0
    failed = 0
    for call in qs:
        try:
            if archive_call_recording(call, config=config):
                archived += 1
        except RuntimeError as exc:
            failed += 1
            if "слишком много запросов" in str(exc).lower():
                time.sleep(sleep_on_rate_limit)
        except Exception:
            failed += 1
        time.sleep(0.25)
    return archived, failed


def purge_old_recordings(company: Company | None = None, retention_days: int | None = None) -> int:
    days = retention_days if retention_days is not None else recording_retention_days()
    cutoff = timezone.now() - timedelta(days=days)
    qs = CallLog.objects.filter(started_at__lt=cutoff).exclude(Q(recording_file="") | Q(recording_file__isnull=True))
    if company is not None:
        qs = qs.filter(company=company)

    purged = 0
    for call in qs.iterator(chunk_size=100):
        call.recording_file.delete(save=False)
        call.recording_file = ""
        call.recording_archived_at = None
        call.save(update_fields=["recording_file", "recording_archived_at", "updated_at"])
        purged += 1
    return purged


def read_call_recording_bytes(call: CallLog) -> tuple[bytes, str]:
    if call.recording_file:
        content_type, _ = mimetypes.guess_type(call.recording_file.name)
        with call.recording_file.open("rb") as handle:
            return handle.read(), content_type or "audio/mpeg"

    integration = TelephonyIntegration.objects.filter(company=call.company).first()
    config = resolve_mango_config(integration) if integration else None
    if config is None:
        raise RuntimeError("Mango Office не настроен.")
    return download_mango_recording(config, call.recording_id, call.recording_url)


def build_local_recording_response(call: CallLog) -> FileResponse:
    if not call.recording_file:
        raise ValueError("Локальная запись отсутствует")

    content_type, _ = mimetypes.guess_type(call.recording_file.name)
    response = FileResponse(call.recording_file.open("rb"), content_type=content_type or "audio/mpeg")
    response["Accept-Ranges"] = "bytes"
    response["Cache-Control"] = "private, max-age=86400"
    return response
