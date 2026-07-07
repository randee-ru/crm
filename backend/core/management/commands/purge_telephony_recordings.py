from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from companies.models import Company
from telephony.recording_storage import purge_old_recordings, recording_retention_days


class Command(BaseCommand):
    help = "Удаляет локальные записи звонков старше заданного срока хранения."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="sportmax", help="Slug компании (пусто — все компании)")
        parser.add_argument(
            "--days",
            type=int,
            default=None,
            help="Срок хранения в днях (по умолчанию TELEPHONY_RECORDING_RETENTION_DAYS)",
        )
        parser.add_argument("--all-companies", action="store_true", help="Обработать все компании")

    def handle(self, *args, **options) -> None:
        days = options["days"] if options["days"] is not None else recording_retention_days()
        company = None
        if not options["all_companies"]:
            try:
                company = Company.objects.get(slug=options["company"], is_active=True)
            except Company.DoesNotExist as exc:
                raise CommandError(f"Компания '{options['company']}' не найдена.") from exc

        purged = purge_old_recordings(company=company, retention_days=days)
        scope = company.slug if company else "все компании"
        self.stdout.write(self.style.SUCCESS(f"Удалено локальных записей: {purged} ({scope}, старше {days} дн.)"))
