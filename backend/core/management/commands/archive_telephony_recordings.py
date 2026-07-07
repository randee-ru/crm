from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from companies.models import Company
from telephony.recording_storage import archive_pending_recordings, recording_retention_days


class Command(BaseCommand):
    help = "Скачивает записи звонков из Mango Office и сохраняет локально (media/telephony/recordings/)."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="sportmax", help="Slug компании")
        parser.add_argument("--limit", type=int, default=100, help="Максимум записей за один запуск")
        parser.add_argument(
            "--days",
            type=int,
            default=None,
            help="Скачивать только звонки за последние N дней (по умолчанию — срок хранения)",
        )

    def handle(self, *args, **options) -> None:
        try:
            company = Company.objects.get(slug=options["company"], is_active=True)
        except Company.DoesNotExist as exc:
            raise CommandError(f"Компания '{options['company']}' не найдена.") from exc

        days = options["days"] if options["days"] is not None else recording_retention_days()
        archived, failed = archive_pending_recordings(company, limit=options["limit"], days=days)
        self.stdout.write(
            self.style.SUCCESS(
                f"Готово: сохранено {archived}, ошибок {failed} (компания {company.slug}, период {days} дн.)"
            )
        )
