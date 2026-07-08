from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from companies.models import Company
from telephony.lead_deals_service import deduplicate_call_lead_deals


class Command(BaseCommand):
    help = "Удаляет дубликаты заявок из телефонии с одним номером телефона."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="sportmax")

    def handle(self, *args, **options) -> None:
        try:
            company = Company.objects.get(slug=options["company"], is_active=True)
        except Company.DoesNotExist as exc:
            raise CommandError(f"Компания '{options['company']}' не найдена.") from exc

        removed = deduplicate_call_lead_deals(company)
        self.stdout.write(self.style.SUCCESS(f"Удалено дубликатов: {removed}"))
