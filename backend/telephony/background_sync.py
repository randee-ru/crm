from __future__ import annotations

import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from companies.models import Company
from telephony.mango_client import MangoRateLimitError, is_mango_rate_limit_error
from telephony.models import TelephonyIntegration
from telephony.recording_storage import archive_pending_recordings, purge_old_recordings, recording_retention_days
from telephony.services import _mango_sync_rate_limited, _mango_sync_cooldown_until, sync_mango_calls

logger = logging.getLogger(__name__)


def get_mango_sync_companies(company_slug: str = "") -> list[Company]:
    queryset = Company.objects.filter(is_active=True)
    if company_slug:
        queryset = queryset.filter(slug=company_slug)

    company_ids = (
        TelephonyIntegration.objects.filter(
            provider=TelephonyIntegration.Provider.MANGO,
            is_active=True,
        )
        .exclude(api_key="")
        .exclude(api_secret="")
        .values_list("company_id", flat=True)
        .distinct()
    )
    return list(queryset.filter(id__in=company_ids).order_by("slug"))


def run_telephony_sync_cycle(
    *,
    company_slug: str = "",
    lookback_days: int | None = None,
    archive_limit: int = 50,
) -> dict[str, int]:
    """Запускает один серверный цикл синхронизации Mango Office."""
    resolved_lookback_days = lookback_days or int(getattr(settings, "TELEPHONY_SYNC_LOOKBACK_DAYS", 2))
    date_to = timezone.localdate()
    date_from = date_to - timedelta(days=resolved_lookback_days)

    companies = get_mango_sync_companies(company_slug=company_slug)
    totals = {
        "companies": len(companies),
        "synced": 0,
        "archive_queued": 0,
        "archived": 0,
        "failed": 0,
        "purged": 0,
    }

    if not companies:
        logger.info("Telephony background sync: no active Mango companies found")
        return totals

    for company in companies:
        try:
            synced, integration, archive_queued = sync_mango_calls(company, date_from=date_from, date_to=date_to)
        except MangoRateLimitError:
            logger.warning(
                "Telephony background sync paused for company=%s because Mango Office returned rate limit",
                company.slug,
            )
            continue
        except Exception as exc:
            if is_mango_rate_limit_error(exc):
                logger.warning(
                    "Telephony background sync paused for company=%s because Mango Office returned rate limit",
                    company.slug,
                )
                continue
            logger.exception("Telephony background sync failed for company=%s", company.slug)
            totals["failed"] += 1
            continue

        totals["synced"] += synced
        totals["archive_queued"] += archive_queued

        if _mango_sync_rate_limited(integration):
            cooldown_until = _mango_sync_cooldown_until(integration)
            logger.warning(
                "Telephony background sync paused for company=%s until=%s because Mango Office returned rate limit",
                company.slug,
                cooldown_until,
            )
            continue

        archived, failed = archive_pending_recordings(
            company,
            limit=archive_limit,
            days=recording_retention_days(),
        )
        purged = purge_old_recordings(company)

        totals["archived"] += archived
        totals["failed"] += failed
        totals["purged"] += purged
        logger.info(
            "Telephony sync cycle complete for company=%s synced=%s archived=%s failed=%s purged=%s last_synced_at=%s",
            company.slug,
            synced,
            archived,
            failed,
            purged,
            integration.last_synced_at,
        )

    return totals
