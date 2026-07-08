from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from django.http import HttpRequest
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import resolve_company_slug
from companies.models import Company
from notifications.emitters import notify_call_ringing, resolve_client_by_phone
from telephony.models import TelephonyIntegration
from telephony.phone import normalize_phone

logger = logging.getLogger(__name__)

RINGING_STATES = {"appeared", "ringing", "on_pbx", "incoming"}


def _verify_mango_signature(api_key: str, api_salt: str, payload_json: str, sign: str) -> bool:
    if not api_key or not api_salt or not sign:
        return False
    expected = hashlib.sha256(f"{api_key}{payload_json}{api_salt}".encode()).hexdigest()
    return expected == sign.strip()


def _extract_phone(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("number", "phone", "extension"):
            raw = value.get(key)
            if isinstance(raw, str) and raw.strip():
                return raw.strip()
    return ""


def _parse_mango_event(data: dict[str, Any]) -> dict[str, str]:
    call_state = str(
        data.get("call_state")
        or data.get("state")
        or data.get("event")
        or data.get("command")
        or ""
    ).strip().lower()

    from_number = _extract_phone(data.get("from") or data.get("from_number") or data.get("caller"))
    to_number = _extract_phone(data.get("to") or data.get("to_number") or data.get("called"))
    entry_id = str(data.get("entry_id") or data.get("entryId") or data.get("call_id") or "").strip()
    line_name = str(data.get("line_number") or data.get("line_name") or data.get("location") or "").strip()

    if not from_number:
        from_number = _extract_phone(data.get("number"))

    return {
        "call_state": call_state,
        "from_number": from_number,
        "to_number": to_number,
        "entry_id": entry_id,
        "line_name": line_name,
    }


def parse_mango_request(request: Request | HttpRequest) -> tuple[str, str, str, dict[str, Any]]:
    """Разбор POST Mango Office: vpbx_api_key, sign, json."""
    post = getattr(request, "POST", None)
    data = getattr(request, "data", None)

    sign = str((post.get("sign") if post else "") or request.headers.get("X-Mango-Sign") or "").strip()
    payload_json = str((post.get("json") if post else "") or "").strip()
    api_key = str((post.get("vpbx_api_key") if post else "") or "").strip()

    if not payload_json and isinstance(data, dict):
        if isinstance(data.get("json"), str):
            payload_json = data["json"].strip()
        elif any(key in data for key in ("call_state", "entry_id", "from", "to", "timestamp", "seq")):
            payload_json = json.dumps(data, separators=(",", ":"), ensure_ascii=False)

    if not api_key and isinstance(data, dict):
        api_key = str(data.get("vpbx_api_key") or "").strip()

    if not sign and isinstance(data, dict):
        sign = str(data.get("sign") or "").strip()

    raw_data: dict[str, Any] = {}
    if payload_json:
        try:
            raw_data = json.loads(payload_json)
        except json.JSONDecodeError as exc:
            raise ValueError("Invalid JSON.") from exc

    return api_key, sign, payload_json, raw_data


def resolve_company_for_mango_webhook(
    *,
    company_slug: str = "",
    api_key: str = "",
) -> tuple[Company | None, TelephonyIntegration | None]:
    if company_slug:
        company = Company.objects.filter(slug=company_slug, is_active=True).first()
        if company is None:
            return None, None
        integration = TelephonyIntegration.objects.filter(company=company, is_active=True).first()
        return company, integration

    if api_key:
        integration = (
            TelephonyIntegration.objects.filter(api_key=api_key, is_active=True)
            .select_related("company")
            .first()
        )
        if integration and integration.company.is_active:
            return integration.company, integration

    integration = (
        TelephonyIntegration.objects.filter(
            is_active=True,
            provider=TelephonyIntegration.Provider.MANGO,
        )
        .exclude(api_key="")
        .select_related("company")
        .first()
    )
    if integration and integration.company.is_active:
        return integration.company, integration

    return None, None


def process_mango_webhook_event(
    company: Company,
    raw_data: dict[str, Any],
) -> dict[str, Any]:
    if not raw_data:
        return {"status": "ok", "reason": "connection_check"}

    parsed = _parse_mango_event(raw_data)
    call_state = parsed["call_state"]
    from_number = normalize_phone(parsed["from_number"])

    if call_state not in RINGING_STATES or not from_number:
        return {"status": "ignored", "call_state": call_state}

    client = resolve_client_by_phone(company, from_number)
    notification = notify_call_ringing(
        company,
        caller_phone=from_number,
        line_name=parsed["line_name"] or "Ресепшен",
        entry_id=parsed["entry_id"],
        client=client,
    )

    return {
        "status": "ok",
        "notification_id": notification.id if notification else None,
    }


class MangoWebhookView(APIView):
    """Входящие события Mango Office (звонок на линии / ресепшен)."""

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request):
        company_slug = resolve_company_slug(request, required=False) or ""
        try:
            api_key, sign, payload_json, raw_data = parse_mango_request(request)
        except ValueError:
            return Response({"detail": "Invalid JSON."}, status=400)

        company, integration = resolve_company_for_mango_webhook(
            company_slug=company_slug,
            api_key=api_key,
        )
        if company is None or integration is None:
            return Response({"detail": "Telephony not configured."}, status=404)

        webhook_secret = (integration.webhook_secret or integration.api_secret or "").strip()
        resolved_api_key = (api_key or integration.api_key or "").strip()
        if webhook_secret and payload_json and sign:
            if not _verify_mango_signature(resolved_api_key, webhook_secret, payload_json, sign):
                logger.warning(
                    "Mango webhook signature mismatch for company %s (api_key=%s)",
                    company.slug,
                    resolved_api_key[:6],
                )
                return Response({"detail": "Invalid signature."}, status=401)

        result = process_mango_webhook_event(company, raw_data)
        return Response(result)

    def get(self, request):
        """Mango иногда проверяет доступность URL через GET."""
        return Response({"status": "ok", "service": "mango-callback"})
