from __future__ import annotations

import time

from django.conf import settings
from django.core.management.base import BaseCommand

from telephony.background_sync import run_telephony_sync_cycle


class Command(BaseCommand):
    help = "Фоновая синхронизация Mango Office: звонки, записи и уведомления."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="", help="Slug компании (если пусто — все активные компании)")
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
            help="Сколько записей догружать в локальный архив за один цикл",
        )
        parser.add_argument(
            "--interval-seconds",
            type=int,
            default=None,
            help="Пауза между циклами. Если не указано — берётся из настроек.",
        )
        parser.add_argument(
            "--once",
            action="store_true",
            help="Выполнить один цикл и завершиться (удобно для ручного запуска/теста).",
        )

    def handle(self, *args, **options) -> None:
        company_slug = (options.get("company") or "").strip()
        lookback_days = options["lookback_days"]
        archive_limit = options["archive_limit"]
        interval_seconds = options["interval_seconds"] or int(
            getattr(settings, "TELEPHONY_BACKGROUND_SYNC_INTERVAL_SECONDS", 600)
        )

        if options["once"]:
            totals = run_telephony_sync_cycle(
                company_slug=company_slug,
                lookback_days=lookback_days,
                archive_limit=archive_limit,
            )
            self.stdout.write(self.style.SUCCESS(f"Готово: {totals}"))
            return

        while True:
            totals = run_telephony_sync_cycle(
                company_slug=company_slug,
                lookback_days=lookback_days,
                archive_limit=archive_limit,
            )
            self.stdout.write(self.style.SUCCESS(f"Цикл синхронизации завершён: {totals}"))
            time.sleep(max(5, interval_seconds))
