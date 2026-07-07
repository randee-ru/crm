from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from companies.models import Company
from telephony.models import TelephonyIntegration
from telephony.recording_storage import archive_pending_recordings, purge_old_recordings, recording_retention_days
from telephony.services import sync_mango_calls


class Command(BaseCommand):
    help = "Периодическая синхронизация Mango Office и догрузка пропущенных записей (для cron)."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="sportmax", help="Slug компании")
        parser.add_argument("--all-companies", action="store_true", help="Обработать все компании с Mango")
        parser.add_argument(
            "--lookback-days",
            type=int,
            default=None,
            help="Сколько дней звонков подтягивать из Mango (по умолчанию TELEPHONY_SYNC_LOOKBACK_DAYS)",
        )
        parser.add_argument(
            "--archive-limit",
            type=int,
            default=50,
            help="Сколько пропущенных записей догрузить за один запуск",
        )

    def handle(self, *args, **options) -> None:
        lookback_days = options["lookback_days"] or int(getattr(settings, "TELEPHONY_SYNC_LOOKBACK_DAYS", 2))
        archive_limit = options["archive_limit"]
        date_to = timezone.localdate()
        date_from = date_to - timedelta(days=lookback_days)

        companies = self._resolve_companies(options)
        for company in companies:
            self.stdout.write(f"Синхронизация Mango: {company.slug} ({date_from} — {date_to})")
            try:
                synced, integration, archive_queued = sync_mango_calls(company, date_from=date_from, date_to=date_to)
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f"  sync error: {exc}"))
                continue

            archived, failed = archive_pending_recordings(
                company,
                limit=archive_limit,
                days=recording_retention_days(),
            )
            purged = purge_old_recordings(company)

            self.stdout.write(
                self.style.SUCCESS(
                    f"  звонков: {synced}, в очередь на выгрузку: {archive_queued}, "
                    f"догружено: {archived}, ошибок: {failed}, удалено старых: {purged}, "
                    f"последняя синхронизация: {integration.last_synced_at:%Y-%m-%d %H:%M}"
                )
            )

    def _resolve_companies(self, options) -> list[Company]:
        if options["all_companies"]:
            company_ids = (
                TelephonyIntegration.objects.filter(
                    provider=TelephonyIntegration.Provider.MANGO,
                    is_active=True,
                )
                .values_list("company_id", flat=True)
                .distinct()
            )
            return list(Company.objects.filter(id__in=company_ids, is_active=True).order_by("slug"))

        try:
            return [Company.objects.get(slug=options["company"], is_active=True)]
        except Company.DoesNotExist as exc:
            raise CommandError(f"Компания '{options['company']}' не найдена.") from exc
