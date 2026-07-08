from __future__ import annotations

import hmac
import logging
from datetime import datetime
from hashlib import sha256

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from channels.choices import MessageDirection, MessengerProvider
from channels.gateway_client import GatewayClientError, get_gateway_client
from channels.models import MessengerAccount, MessengerIntegration, MessengerThread
from companies.models import Company
from telephony.phone import normalize_phone

logger = logging.getLogger(__name__)

GATEWAY_STATUS_MAP = {
    "pending": MessengerAccount.Status.PENDING,
    "qr": MessengerAccount.Status.QR,
    "code_required": MessengerAccount.Status.CODE_REQUIRED,
    "password_required": MessengerAccount.Status.PASSWORD_REQUIRED,
    "ready": MessengerAccount.Status.READY,
    "error": MessengerAccount.Status.ERROR,
    "disconnected": MessengerAccount.Status.DISCONNECTED,
}


def verify_gateway_signature(body: bytes, signature: str) -> bool:
    secret = settings.MESSENGER_GATEWAY_SECRET.encode()
    expected = hmac.new(secret, body, sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def _parse_sent_at(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = parse_datetime(value)
    if parsed and timezone.is_naive(parsed):
        return timezone.make_aware(parsed)
    return parsed


def _apply_gateway_session(account: MessengerAccount, session: dict) -> MessengerAccount:
    status = GATEWAY_STATUS_MAP.get(str(session.get("status") or ""), MessengerAccount.Status.PENDING)
    account.status = status
    account.phone = str(session.get("phone") or account.phone or "")
    account.error_message = str(session.get("error") or "")
    account.settings = {
        **(account.settings or {}),
        "qr_data_url": str(session.get("qr_data_url") or ""),
    }
    if status == MessengerAccount.Status.READY and not account.connected_at:
        account.connected_at = timezone.now()
    account.save(
        update_fields=[
            "status",
            "phone",
            "error_message",
            "settings",
            "connected_at",
            "updated_at",
        ],
    )
    return account


def get_ready_account(company: Company, provider: str) -> MessengerAccount | None:
    return (
        MessengerAccount.objects.filter(
            company=company,
            provider=provider,
            status=MessengerAccount.Status.READY,
            is_active=True,
        )
        .order_by("-connected_at", "-id")
        .first()
    )


def ensure_gateway_integration(company: Company, provider: str) -> MessengerIntegration:
    integration, _ = MessengerIntegration.objects.get_or_create(
        company=company,
        provider=provider,
        defaults={"connection_mode": "gateway"},
    )
    if integration.connection_mode != "gateway":
        integration.connection_mode = "gateway"
        integration.save(update_fields=["connection_mode", "updated_at"])
    return integration


@transaction.atomic
def create_gateway_account(
    *,
    company: Company,
    provider: str,
    label: str = "",
    phone: str = "",
) -> MessengerAccount:
    client = get_gateway_client()
    session = client.create_session(
        company_slug=company.slug,
        provider=provider,
        label=label or MessengerProvider(provider).label,
        phone=phone,
        api_id=settings.TELEGRAM_API_ID or None,
        api_hash=settings.TELEGRAM_API_HASH,
    )

    account = MessengerAccount.objects.create(
        company=company,
        provider=provider,
        gateway_session_id=str(session["id"]),
        label=label or MessengerProvider(provider).label,
        phone=phone,
        status=GATEWAY_STATUS_MAP.get(str(session.get("status")), MessengerAccount.Status.PENDING),
        error_message=str(session.get("error") or ""),
        settings={"qr_data_url": str(session.get("qr_data_url") or "")},
    )
    ensure_gateway_integration(company, provider)
    return _apply_gateway_session(account, session)


def refresh_gateway_account(account: MessengerAccount) -> MessengerAccount:
    client = get_gateway_client()
    try:
        session = client.get_session(account.gateway_session_id)
    except GatewayClientError as exc:
        account.status = MessengerAccount.Status.ERROR
        account.error_message = str(exc)
        account.save(update_fields=["status", "error_message", "updated_at"])
        return account
    return _apply_gateway_session(account, session)


def submit_gateway_telegram_code(account: MessengerAccount, code: str) -> MessengerAccount:
    client = get_gateway_client()
    session = client.submit_telegram_code(account.gateway_session_id, code)
    return _apply_gateway_session(account, session)


def submit_gateway_telegram_password(account: MessengerAccount, password: str) -> MessengerAccount:
    client = get_gateway_client()
    session = client.submit_telegram_password(account.gateway_session_id, password)
    return _apply_gateway_session(account, session)


def submit_gateway_max_code(account: MessengerAccount, code: str) -> MessengerAccount:
    client = get_gateway_client()
    session = client.submit_max_code(account.gateway_session_id, code)
    return _apply_gateway_session(account, session)


def submit_gateway_max_password(account: MessengerAccount, password: str) -> MessengerAccount:
    client = get_gateway_client()
    session = client.submit_max_password(account.gateway_session_id, password)
    return _apply_gateway_session(account, session)


def disconnect_gateway_account(account: MessengerAccount) -> None:
    client = get_gateway_client()
    try:
        client.delete_session(account.gateway_session_id)
    except GatewayClientError:
        logger.warning("Failed to delete gateway session %s", account.gateway_session_id)
    account.is_active = False
    account.status = MessengerAccount.Status.DISCONNECTED
    account.save(update_fields=["is_active", "status", "updated_at"])


def send_via_gateway(
    *,
    account: MessengerAccount,
    thread: MessengerThread,
    text: str,
) -> dict:
    client = get_gateway_client()
    return client.send_message(
        session_id=account.gateway_session_id,
        chat_id=thread.external_chat_id,
        text=text,
        contact_phone=thread.contact_phone,
        contact_name=thread.contact_name,
    )


@transaction.atomic
def process_gateway_inbound(company: Company, payload: dict) -> dict:
    from channels.services import record_messenger_message, sync_client_message

    if payload.get("event") != "message.inbound":
        return {"status": "ignored", "reason": "unknown_event"}

    provider = str(payload.get("provider") or "")
    session_id = str(payload.get("session_id") or "")
    external_chat_id = str(payload.get("external_chat_id") or "")
    if not provider or not session_id or not external_chat_id:
        return {"status": "ignored", "reason": "missing_fields"}

    account = MessengerAccount.objects.filter(
        company=company,
        gateway_session_id=session_id,
        provider=provider,
        is_active=True,
    ).first()
    if not account:
        return {"status": "error", "reason": "account_not_found"}

    contact_phone = normalize_phone(str(payload.get("contact_phone") or ""))
    contact_name = str(payload.get("contact_name") or "").strip()
    body = str(payload.get("body") or "").strip()
    external_id = str(payload.get("external_message_id") or "").strip()
    if not body:
        return {"status": "ignored", "reason": "empty_body"}

    thread_defaults = {
        "contact_phone": contact_phone,
        "contact_name": contact_name,
        "account": account,
    }
    thread, _ = MessengerThread.objects.update_or_create(
        company=company,
        provider=provider,
        external_chat_id=external_chat_id,
        defaults=thread_defaults,
    )
    if contact_phone and not thread.contact_phone:
        thread.contact_phone = contact_phone
        thread.save(update_fields=["contact_phone", "updated_at"])
    if contact_name and not thread.contact_name:
        thread.contact_name = contact_name
        thread.save(update_fields=["contact_name", "updated_at"])
    if account and thread.account_id != account.id:
        thread.account = account
        thread.save(update_fields=["account", "updated_at"])

    message = record_messenger_message(
        thread=thread,
        direction=MessageDirection.INBOUND,
        body=body,
        external_id=external_id or f"inbound-{thread.id}-{int(timezone.now().timestamp())}",
        sent_at=_parse_sent_at(str(payload.get("sent_at") or "")),
        raw_payload=payload,
    )
    sync_client_message(company=company, thread=thread, message=message)
    return {"status": "ok", "thread_id": thread.id, "message_id": message.id}
