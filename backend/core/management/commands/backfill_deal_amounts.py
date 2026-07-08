from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from companies.models import Company
from crm.deal_amounts import (
    backfill_deal_amounts,
    sync_membership_prices_from_sales,
    sync_renewal_deal_amounts,
)
from crm.pipelines import normalize_company_pipelines


class Command(BaseCommand):
    help = "Заполняет суммы сделок из продаж 1С (без заглушек)."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="sportmax")

    def handle(self, *args, **options) -> None:
        try:
            company = Company.objects.get(slug=options["company"], is_active=True)
        except Company.DoesNotExist as exc:
            raise CommandError(f"Компания '{options['company']}' не найдена.") from exc

        normalize_company_pipelines(company)
        deals = backfill_deal_amounts(company)
        memberships = sync_membership_prices_from_sales(company)
        renewals = sync_renewal_deal_amounts(company)

        self.stdout.write(
            self.style.SUCCESS(
                f"Сделок обновлено: {deals}, абонементов: {memberships}, продлений: {renewals}"
            )
        )
