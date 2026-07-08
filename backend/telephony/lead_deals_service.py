from __future__ import annotations

from django.db.models import Q

from crm.choices import LeadSource
from crm.models import Deal
from crm.pipelines import GENERAL_PIPELINE_SLUG, ensure_default_pipeline, get_stage_by_code
from telephony.lead_deals import (
    build_lead_deal_description,
    build_lead_deal_title,
    call_caller_phone,
    extract_phone_from_lead_title,
    should_create_lead_deal_from_call,
)
from telephony.models import CallLog
from telephony.phone import normalize_phone, phone_tail


def _lead_deal_phone(deal: Deal) -> str:
    return normalize_phone(deal.contact_phone) or extract_phone_from_lead_title(deal.title)


def find_open_lead_deal_for_phone(company, phone: str) -> Deal | None:
    """Открытая заявка по телефону в общей воронке (без привязанного клиента)."""
    normalized = normalize_phone(phone)
    tail = phone_tail(normalized)
    if not tail:
        return None

    candidates = (
        Deal.objects.filter(
            company=company,
            client__isnull=True,
            pipeline__slug=GENERAL_PIPELINE_SLUG,
            stage__is_won=False,
            stage__is_lost=False,
        )
        .filter(Q(contact_phone__endswith=tail) | Q(title__icontains=tail))
        .select_related("stage", "pipeline")
        .order_by("-updated_at")
    )

    for deal in candidates:
        if phone_tail(_lead_deal_phone(deal)) == tail:
            return deal
    return None


def append_call_to_lead_deal(deal: Deal, call: CallLog) -> Deal:
    note = build_lead_deal_description(call)
    description = deal.description or ""
    if note not in description:
        deal.description = f"{description.rstrip()}\n\n---\n{note}" if description else note

    phone = call_caller_phone(call)
    if phone and not deal.contact_phone:
        deal.contact_phone = phone[:32]

    deal.save(update_fields=["description", "contact_phone", "updated_at"])
    return deal


def ensure_lead_deal_from_call(call: CallLog) -> Deal | None:
    if not should_create_lead_deal_from_call(call):
        return None

    external_key = f"call:{call.pk}"
    existing_by_call = Deal.objects.filter(company=call.company, external_key=external_key).first()
    if existing_by_call:
        return existing_by_call

    caller_phone = call_caller_phone(call)
    existing_by_phone = find_open_lead_deal_for_phone(call.company, caller_phone)
    if existing_by_phone:
        return append_call_to_lead_deal(existing_by_phone, call)

    pipeline = ensure_default_pipeline(call.company)
    stage = get_stage_by_code(pipeline, "new_lead")

    return Deal.objects.create(
        company=call.company,
        pipeline=pipeline,
        stage=stage,
        client=call.client,
        title=build_lead_deal_title(call)[:255],
        description=build_lead_deal_description(call),
        source_name="Телефония",
        channel=(call.line_name or call.source or "телефон")[:64],
        lead_source=LeadSource.CALL,
        contact_phone=caller_phone[:32],
        external_key=external_key,
    )


def deduplicate_call_lead_deals(company) -> int:
    """Удаляет повторные заявки с одним номером, оставляет самую свежую."""
    deals = (
        Deal.objects.filter(
            company=company,
            client__isnull=True,
            pipeline__slug=GENERAL_PIPELINE_SLUG,
            stage__code="new_lead",
        )
        .filter(
            Q(lead_source=LeadSource.CALL)
            | Q(source_name="Телефония")
            | Q(title__startswith="Заявка —")
        )
        .order_by("-updated_at", "-id")
    )

    seen_tails: set[str] = set()
    removed = 0
    for deal in deals:
        tail = phone_tail(_lead_deal_phone(deal))
        if not tail:
            continue
        if tail in seen_tails:
            deal.delete()
            removed += 1
        else:
            seen_tails.add(tail)
    return removed
