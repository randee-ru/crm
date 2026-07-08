from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from companies.models import Company
from telephony.lead_deals_service import ensure_lead_deal_from_call
from telephony.models import CallLog


class Command(BaseCommand):
    help = "Создать сделки «Новая заявка» для входящих звонков без найденного клиента."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="sportmax", help="Slug компании")
        parser.add_argument("--dry-run", action="store_true", help="Только показать, без создания")

    def handle(self, *args, **options) -> None:
        try:
            company = Company.objects.get(slug=options["company"], is_active=True)
        except Company.DoesNotExist as exc:
            raise CommandError(f"Компания '{options['company']}' не найдена.") from exc

        calls = (
            CallLog.objects.filter(
                company=company,
                direction=CallLog.Direction.INCOMING,
                client__isnull=True,
            )
            .order_by("-started_at")
        )

        created = 0
        skipped = 0
        for call in calls:
            if options["dry_run"]:
                self.stdout.write(f"  [dry-run] call #{call.pk} {call.caller_phone} → {call.line_name}")
                continue

            deal = ensure_lead_deal_from_call(call)
            if not deal:
                skipped += 1
            elif deal.external_key == f"call:{call.pk}":
                created += 1
                self.stdout.write(f"  сделка #{deal.pk}: {deal.title}")
            else:
                skipped += 1
                self.stdout.write(f"  повтор {call.caller_phone} → сделка #{deal.pk}")

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS(f"Найдено звонков: {calls.count()}"))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Готово: создано/найдено {created} сделок, пропущено {skipped}, звонков без клиента: {calls.count()}"
                )
            )
