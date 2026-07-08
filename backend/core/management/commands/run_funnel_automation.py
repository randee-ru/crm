from __future__ import annotations

from django.core.management.base import BaseCommand

from companies.models import Company
from crm.funnel_services import run_funnel_automation_all, run_funnel_automation_for_company


class Command(BaseCommand):
    help = "Автоматизации воронок CRM: visit→follow_up, продления, задачи, уведомления (для cron)."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="", help="Slug компании (если не указан — все компании)")
        parser.add_argument("--all-companies", action="store_true", help="Обработать все активные компании")

    def handle(self, *args, **options) -> None:
        company_slug = (options.get("company") or "").strip()
        all_companies = options.get("all_companies") or not company_slug

        if all_companies:
            totals = run_funnel_automation_all()
            self.stdout.write(self.style.SUCCESS(f"Готово: {totals}"))
            return

        company = Company.objects.filter(slug=company_slug, is_active=True).first()
        if not company:
            self.stderr.write(self.style.ERROR(f"Компания «{company_slug}» не найдена."))
            return

        result = run_funnel_automation_for_company(company)
        self.stdout.write(self.style.SUCCESS(f"{company.slug}: {result}"))
