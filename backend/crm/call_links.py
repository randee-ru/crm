from __future__ import annotations

from django.db.models import Q, QuerySet

from crm.models import Deal
from telephony.lead_deals import extract_phone_from_lead_title
from telephony.models import CallLog
from telephony.phone import normalize_phone, phone_tail


def resolve_calls_for_deal(deal: Deal, *, limit: int = 10) -> QuerySet[CallLog]:
    """Звонки, связанные со сделкой: по external_key и по номеру телефона."""
    call_ids: list[int] = []

    if deal.external_key.startswith("call:"):
        try:
            call_ids.append(int(deal.external_key.split(":", 1)[1]))
        except (ValueError, IndexError):
            pass

    phone = normalize_phone(deal.contact_phone or "")
    if not phone:
        phone = extract_phone_from_lead_title(deal.title)

    tail = phone_tail(phone)
    if tail:
        candidates = (
            CallLog.objects.filter(
                company=deal.company,
                direction=CallLog.Direction.INCOMING,
            )
            .filter(Q(caller_phone__endswith=tail) | Q(from_number__endswith=tail))
            .order_by("-started_at")[: max(limit * 3, 30)]
        )
        for call in candidates:
            caller = normalize_phone(call.caller_phone or call.from_number or "")
            if phone_tail(caller) == tail and call.pk not in call_ids:
                call_ids.append(call.pk)
            if len(call_ids) >= limit:
                break

    if not call_ids:
        return CallLog.objects.none()

    return CallLog.objects.filter(pk__in=call_ids).order_by("-started_at")
