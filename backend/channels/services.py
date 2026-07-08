from __future__ import annotations

from datetime import datetime

from django.db import transaction
from django.utils import timezone

from channels.choices import MessageDirection, MessengerProvider
from channels.max_client import ParsedMaxMessage, send_max_message
from channels.models import MessengerAccount, MessengerIntegration, MessengerMessage, MessengerThread
from clients.models import Client, ClientMessage
from companies.models import Company
from notifications.emitters import resolve_client_by_phone
from notifications.telegram import send_telegram_notification
from telephony.phone import normalize_phone


PROVIDER_CHANNEL_LABELS = {
    MessengerProvider.MAX: "max",
    MessengerProvider.TELEGRAM: "telegram",
    MessengerProvider.WHATSAPP: "whatsapp",
}


def _provider_label(provider: str) -> str:
    return PROVIDER_CHANNEL_LABELS.get(provider, provider)


def _resolve_client(company: Company, phone: str) -> Client | None:
    normalized = normalize_phone(phone)
    if not normalized:
        return None
    return resolve_client_by_phone(company, normalized)


def _client_message_external_key(provider: str, external_id: str) -> str:
    return f"channels:{provider}:{external_id}"


def sync_client_message(
    *,
    company: Company,
    thread: MessengerThread,
    message: MessengerMessage,
) -> ClientMessage | None:
    if not message.external_id:
        return None

    client = thread.client
    if not client and thread.contact_phone:
        client = _resolve_client(company, thread.contact_phone)
        if client and thread.client_id != client.id:
            thread.client = client
            thread.save(update_fields=["client", "updated_at"])

    if not client:
        return None

    external_key = _client_message_external_key(thread.provider, message.external_id)
    defaults = {
        "client": client,
        "channel": _provider_label(thread.provider),
        "message_type": "messenger",
        "kind": message.direction,
        "source": "channels",
        "phone": thread.contact_phone,
        "body": message.body,
        "sent_at": message.sent_at or timezone.now(),
    }
    client_message, _ = ClientMessage.objects.update_or_create(
        company=company,
        external_key=external_key,
        defaults=defaults,
    )
    return client_message


def update_thread_preview(thread: MessengerThread, message: MessengerMessage) -> None:
    preview = (message.body or "").replace("\n", " ").strip()
    if len(preview) > 200:
        preview = f"{preview[:197]}..."
    thread.last_message_at = message.sent_at or timezone.now()
    thread.last_message_preview = preview
    if message.direction == MessageDirection.INBOUND:
        thread.unread_count = (thread.unread_count or 0) + 1
    thread.save(
        update_fields=[
            "last_message_at",
            "last_message_preview",
            "unread_count",
            "updated_at",
        ],
    )


@transaction.atomic
def record_messenger_message(
    *,
    thread: MessengerThread,
    direction: str,
    body: str,
    external_id: str = "",
    sent_at: datetime | None = None,
    author_user=None,
    raw_payload: dict | None = None,
    update_preview: bool = True,
) -> MessengerMessage:
    if external_id:
        existing = MessengerMessage.objects.filter(thread=thread, external_id=external_id).first()
        if existing:
            return existing

    message = MessengerMessage.objects.create(
        thread=thread,
        direction=direction,
        external_id=external_id,
        body=body,
        sent_at=sent_at or timezone.now(),
        author_user=author_user,
        raw_payload=raw_payload or {},
    )
    if update_preview:
        update_thread_preview(thread, message)
    sync_client_message(company=thread.company, thread=thread, message=message)

    if direction == MessageDirection.INBOUND:
        preview = (message.body or "").replace("\n", " ").strip()
        if len(preview) > 200:
            preview = f"{preview[:197]}..."
        contact = thread.contact_name or thread.contact_phone or "Клиент"
        send_telegram_notification(
            "💬 Новое сообщение от клиента\n"
            f"{thread.company.name} · {_provider_label(thread.provider)}\n"
            f"{contact}: {preview}",
        )

    return message


@transaction.atomic
def upsert_thread_from_max(
    company: Company,
    parsed: ParsedMaxMessage,
) -> MessengerThread:
    client = _resolve_client(company, parsed.contact_phone) if parsed.contact_phone else None
    defaults = {
        "external_user_id": parsed.user_id,
        "chat_type": parsed.chat_type,
        "contact_name": parsed.contact_name,
        "contact_phone": normalize_phone(parsed.contact_phone),
        "client": client,
    }
    thread, _ = MessengerThread.objects.update_or_create(
        company=company,
        provider=MessengerProvider.MAX,
        external_chat_id=parsed.chat_id,
        defaults=defaults,
    )
    if parsed.contact_phone and not thread.contact_phone:
        thread.contact_phone = normalize_phone(parsed.contact_phone)
        thread.save(update_fields=["contact_phone", "updated_at"])
    if parsed.contact_name and not thread.contact_name:
        thread.contact_name = parsed.contact_name
        thread.save(update_fields=["contact_name", "updated_at"])
    if client and thread.client_id != client.id:
        thread.client = client
        thread.save(update_fields=["client", "updated_at"])
    return thread


@transaction.atomic
def process_max_inbound(company: Company, parsed: ParsedMaxMessage) -> dict:
    if parsed.update_type not in {"message_created", "bot_started"}:
        return {"status": "ignored", "reason": parsed.update_type}

    thread = upsert_thread_from_max(company, parsed)
    if parsed.update_type == "bot_started" and not parsed.text:
        return {"status": "ok", "thread_id": thread.id}

    if not parsed.text and not parsed.external_id:
        return {"status": "ignored", "reason": "empty_message"}

    message = record_messenger_message(
        thread=thread,
        direction=MessageDirection.INBOUND,
        body=parsed.text,
        external_id=parsed.external_id or f"max-inbound-{parsed.chat_id}-{int(timezone.now().timestamp())}",
        sent_at=parsed.sent_at,
        raw_payload=parsed.raw_payload,
    )
    return {"status": "ok", "thread_id": thread.id, "message_id": message.id}


@transaction.atomic
def send_thread_message(
    *,
    thread: MessengerThread,
    body: str,
    author_user=None,
) -> MessengerMessage:
    trimmed = body.strip()
    if not trimmed:
        raise ValueError("Введите текст сообщения.")

    integration = MessengerIntegration.objects.filter(
        company=thread.company,
        provider=thread.provider,
        is_active=True,
    ).first()

    external_id = ""
    raw_payload: dict = {}

    if thread.provider in {MessengerProvider.TELEGRAM, MessengerProvider.WHATSAPP, MessengerProvider.MAX}:
        from channels.gateway_services import get_ready_account, send_via_gateway

        account = thread.account if thread.account_id else None
        if not account or account.status != MessengerAccount.Status.READY:
            account = get_ready_account(thread.company, thread.provider)
        if account:
            response = send_via_gateway(account=account, thread=thread, text=trimmed)
            raw_payload = response if isinstance(response, dict) else {}
            external_id = str(
                raw_payload.get("external_message_id") or raw_payload.get("external_id") or ""
            ).strip()
        elif thread.provider == MessengerProvider.MAX:
            if not integration or not integration.bot_token:
                raise ValueError("Интеграция не настроена.")
            response = send_max_message(
                integration.bot_token,
                chat_id=thread.external_chat_id,
                text=trimmed,
                user_id=thread.external_user_id,
                chat_type=thread.chat_type,
            )
            raw_payload = response if isinstance(response, dict) else {}
            message_data = raw_payload.get("message") if isinstance(raw_payload.get("message"), dict) else raw_payload
            body_data = message_data.get("body") if isinstance(message_data.get("body"), dict) else {}
            external_id = str(body_data.get("mid") or message_data.get("mid") or "").strip()
        else:
            raise ValueError("Личный аккаунт не подключён. Подключите мессенджер в настройках.")
    else:
        raise ValueError("Неизвестный провайдер.")

    if not external_id:
        external_id = f"outbound-{thread.id}-{int(timezone.now().timestamp())}"

    message = record_messenger_message(
        thread=thread,
        direction=MessageDirection.OUTBOUND,
        body=trimmed,
        external_id=external_id,
        author_user=author_user,
        raw_payload=raw_payload,
    )
    return message


def mark_thread_read(thread: MessengerThread) -> None:
    if thread.unread_count:
        thread.unread_count = 0
        thread.save(update_fields=["unread_count", "updated_at"])
