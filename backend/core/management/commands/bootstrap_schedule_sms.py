from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand

from companies.models import Company
from schedule.models import ScheduleSmsIntegration


class Command(BaseCommand):
    help = (
        "Подключает SMS.ru для расписания из SMS_RU_API_ID без имени отправителя "
        "(стандартный SMS.ru, без ежемесячной платы за буквенное имя)."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--company",
            default="sportmax",
            help="Slug компании (по умолчанию sportmax).",
        )
        parser.add_argument(
            "--api-id",
            default="",
            help="Переопределить SMS_RU_API_ID из окружения.",
        )

    def handle(self, *args, **options) -> None:
        api_id = str(options.get("api_id") or "").strip() or getattr(settings, "SMS_RU_API_ID", "")
        if not api_id:
            self.stdout.write(self.style.WARNING("SMS_RU_API_ID не задан — пропуск."))
            return

        company_slug = str(options["company"]).strip()
        company = Company.objects.filter(slug=company_slug, is_active=True).first()
        if company is None:
            self.stderr.write(self.style.ERROR(f"Компания {company_slug!r} не найдена."))
            return

        integration, created = ScheduleSmsIntegration.objects.update_or_create(
            company=company,
            provider=ScheduleSmsIntegration.Provider.SMS_RU,
            title="SMS.ru",
            defaults={
                "api_key": api_id,
                "sender_name": "",
                "is_active": True,
                "is_primary": True,
            },
        )
        ScheduleSmsIntegration.objects.filter(company=company).exclude(id=integration.id).update(
            is_primary=False,
        )

        action = "создана" if created else "обновлена"
        self.stdout.write(
            self.style.SUCCESS(
                f"SMS-интеграция {action} для {company.slug}: SMS.ru, без имени отправителя."
            )
        )
