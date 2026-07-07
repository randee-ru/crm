from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from companies.models import Company
from schedule.group_programs import ensure_default_group_programs


class Command(BaseCommand):
    help = "Создаёт каталог групповых программ для компании."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="sportmax", help="Slug компании")

    def handle(self, *args, **options) -> None:
        try:
            company = Company.objects.get(slug=options["company"], is_active=True)
        except Company.DoesNotExist as exc:
            raise CommandError(f"Компания '{options['company']}' не найдена.") from exc

        created = ensure_default_group_programs(company)
        total = company.group_programs.filter(is_active=True).count()
        self.stdout.write(self.style.SUCCESS(f"Готово: добавлено {created}, всего программ {total}"))
