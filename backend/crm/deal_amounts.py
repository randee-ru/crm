from __future__ import annotations

from decimal import Decimal

from clients.models import Client
from companies.models import Company
from crm.models import Deal
from sales.models import Sale


def get_client_purchase_info(client: Client | None, company: Company) -> tuple[Decimal | None, str | None]:
    """Последняя завершённая продажа клиента или LTV из карточки."""
    if client is None:
        return None, None

    sale = (
        Sale.objects.filter(
            company=company,
            client=client,
            status=Sale.Status.COMPLETED,
        )
        .exclude(total_amount=0)
        .order_by("-sold_at", "-id")
        .first()
    )
    if sale:
        amount = sale.paid_amount if sale.paid_amount > 0 else sale.total_amount
        return amount, sale.title

    if client.ltv_total and client.ltv_total > 0:
        return client.ltv_total, None

    return None, None


def resolve_deal_amount(deal: Deal, company: Company | None = None) -> Decimal | None:
    """Сумма сделки: своё поле → продажа клиента → LTV."""
    if deal.amount and deal.amount > 0:
        return deal.amount

    company = company or deal.company
    if deal.client_id:
        amount, _ = get_client_purchase_info(deal.client, company)
        return amount

    return None


def backfill_deal_amounts(company: Company, *, batch_size: int = 500) -> int:
    """Заполняет amount у сделок из продаж 1С."""
    updated = 0
    queryset = (
        Deal.objects.filter(company=company, client__isnull=False)
        .filter(amount=0)
        .select_related("client")
        .order_by("id")
    )

    for deal in queryset.iterator(chunk_size=batch_size):
        amount, tariff = get_client_purchase_info(deal.client, company)
        if not amount:
            continue

        fields = ["amount", "updated_at"]
        deal.amount = amount
        if tariff and not deal.desired_tariff:
            deal.desired_tariff = tariff[:120]
            fields.append("desired_tariff")
        if deal.pipeline and deal.pipeline.slug == "membership-renewal":
            deal.renewal_amount = amount
            fields.append("renewal_amount")

        deal.save(update_fields=fields)
        updated += 1

    return updated


def sync_membership_prices_from_sales(company: Company) -> int:
    """Обновляет цены абонементов по последним продажам."""
    from memberships.models import Membership

    updated = 0
    for membership in Membership.objects.filter(company=company).select_related("client"):
        amount, title = get_client_purchase_info(membership.client, company)
        if not amount:
            continue

        fields: list[str] = []
        if membership.price != amount:
            membership.price = amount
            fields.append("price")
        if title and membership.title in {"", "Абонемент клуба"}:
            membership.title = title[:255]
            fields.append("title")
        if fields:
            fields.append("updated_at")
            membership.save(update_fields=fields)
            updated += 1

    return updated


def sync_renewal_deal_amounts(company: Company) -> int:
    """Синхронизирует суммы сделок продления с абонементами и продажами."""
    updated = 0
    deals = Deal.objects.filter(
        company=company,
        pipeline__slug="membership-renewal",
    ).select_related("client", "membership")

    for deal in deals:
        amount = None
        if deal.membership_id and deal.membership.price > 0:
            amount = deal.membership.price
        elif deal.client_id:
            amount, _ = get_client_purchase_info(deal.client, company)

        if not amount or deal.amount == amount:
            continue

        deal.amount = amount
        deal.renewal_amount = amount
        deal.save(update_fields=["amount", "renewal_amount", "updated_at"])
        updated += 1

    return updated
