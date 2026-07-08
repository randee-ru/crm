from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from companies.models import Company
from crm.deal_amounts import (
    backfill_deal_amounts,
    get_client_purchase_info,
    sync_membership_prices_from_sales,
    sync_renewal_deal_amounts,
)
from crm.funnel_services import create_renewal_deals, run_funnel_automation_for_company
from crm.models import Deal
from crm.pipelines import (
    SALES_PIPELINE_SLUG,
    ensure_winback_pipeline,
    get_stage_by_code,
    normalize_company_pipelines,
)
from memberships.models import Membership


class Command(BaseCommand):
    help = "Наполняет воронки продления и возврата реальными суммами из продаж 1С."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="sportmax")
        parser.add_argument(
            "--renewal-limit",
            type=int,
            default=0,
            help="Сколько клиентов из «Договор» взять для абонементов (0 = все).",
        )
        parser.add_argument(
            "--winback-limit",
            type=int,
            default=0,
            help="Сколько сделок возврата создать (0 = все подходящие).",
        )

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        try:
            company = Company.objects.get(slug=options["company"], is_active=True)
        except Company.DoesNotExist as exc:
            raise CommandError(f"Компания '{options['company']}' не найдена.") from exc

        normalize_company_pipelines(company)
        today = timezone.localdate()

        sales_deals_qs = (
            Deal.objects.filter(
                company=company,
                pipeline__slug=SALES_PIPELINE_SLUG,
                stage__code="contract",
                client__isnull=False,
            )
            .select_related("client", "branch")
            .order_by("-updated_at")
        )
        renewal_limit = options["renewal_limit"]
        sales_deals = list(sales_deals_qs[:renewal_limit] if renewal_limit > 0 else sales_deals_qs)

        memberships_created = 0
        skipped_no_amount = 0
        for index, deal in enumerate(sales_deals):
            client = deal.client
            if Membership.objects.filter(company=company, client=client, status=Membership.Status.ACTIVE).exists():
                continue

            amount, tariff = get_client_purchase_info(client, company)
            if not amount:
                skipped_no_amount += 1
                continue

            days_left = 3 + (index % 28)
            Membership.objects.create(
                company=company,
                branch=deal.branch or client.branch,
                client=client,
                title=(deal.desired_tariff or tariff or "Абонемент")[:255],
                status=Membership.Status.ACTIVE,
                starts_at=today - timedelta(days=60),
                ends_at=today + timedelta(days=days_left),
                visits_used=0,
                visit_limit=None,
                price=amount,
            )
            memberships_created += 1

        renewal_deals = create_renewal_deals(company)

        winback_pipeline = ensure_winback_pipeline(company)
        winback_stage = get_stage_by_code(winback_pipeline, "winback_new")
        winback_created = 0
        winback_qs = (
            Deal.objects.filter(
                company=company,
                pipeline__slug=SALES_PIPELINE_SLUG,
                stage__code="contract",
                client__isnull=False,
            )
            .select_related("client", "branch")
            .order_by("-updated_at")
        )
        winback_limit = options["winback_limit"]
        candidates = list(winback_qs[:winback_limit] if winback_limit > 0 else winback_qs)

        for deal in candidates:
            external_key = f"winback:client:{deal.client_id}"
            if Deal.objects.filter(company=company, external_key=external_key).exists():
                continue

            client = deal.client
            amount, _ = get_client_purchase_info(client, company)
            if amount is None:
                amount = deal.amount if deal.amount > 0 else Decimal("0")

            Deal.objects.create(
                company=company,
                pipeline=winback_pipeline,
                stage=winback_stage,
                branch=deal.branch or client.branch,
                client=client,
                title=f"Возврат: {client.full_name}",
                contact_name=client.full_name,
                contact_phone=client.phone,
                contact_email=client.email,
                amount=amount,
                external_key=external_key,
            )
            winback_created += 1

        enriched = 0
        for deal in Deal.objects.filter(company=company, client__isnull=False).select_related("client").iterator(
            chunk_size=500
        ):
            client = deal.client
            updates: list[str] = []
            if not deal.contact_name and client.full_name:
                deal.contact_name = client.full_name
                updates.append("contact_name")
            if not deal.contact_phone and client.phone:
                deal.contact_phone = client.phone
                updates.append("contact_phone")
            if not deal.contact_email and client.email:
                deal.contact_email = client.email
                updates.append("contact_email")
            if updates:
                updates.append("updated_at")
                deal.save(update_fields=updates)
                enriched += 1

        amounts_backfilled = backfill_deal_amounts(company)
        memberships_synced = sync_membership_prices_from_sales(company)
        renewals_synced = sync_renewal_deal_amounts(company)
        automation = run_funnel_automation_for_company(company)

        self.stdout.write(
            self.style.SUCCESS(
                f"Абонементов: {memberships_created}, без суммы пропущено: {skipped_no_amount}, "
                f"продлений: {renewal_deals}, возврат: {winback_created}, "
                f"суммы сделок: {amounts_backfilled}, абонементы: {memberships_synced}, "
                f"продления синхр.: {renewals_synced}, контактов: {enriched}, "
                f"автоматизация: {automation}"
            )
        )
