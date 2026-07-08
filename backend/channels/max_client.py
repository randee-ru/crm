from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

MAX_API_BASE = "https://platform-api2.max.ru"


@dataclass
class ParsedMaxMessage:
    update_type: str
    external_id: str
    chat_id: str
    user_id: str
    chat_type: str
    contact_name: str
    contact_phone: str
    text: str
    sent_at: datetime | None
    raw_payload: dict[str, Any]


def _extract_text(body: Any) -> str:
    if isinstance(body, dict):
        return str(body.get("text") or "").strip()
    if isinstance(body, str):
        return body.strip()
    return ""


def parse_max_update(payload: dict[str, Any]) -> ParsedMaxMessage | None:
    update_type = str(payload.get("update_type") or "").strip()
    if not update_type:
        return None

    message = payload.get("message") if isinstance(payload.get("message"), dict) else {}
    recipient = message.get("recipient") if isinstance(message.get("recipient"), dict) else {}
    sender = message.get("sender") if isinstance(message.get("sender"), dict) else {}
    body = message.get("body") if isinstance(message.get("body"), dict) else {}

    chat_id = str(recipient.get("chat_id") or payload.get("chat_id") or "").strip()
    user_id = str(sender.get("user_id") or payload.get("user_id") or "").strip()
    chat_type = str(recipient.get("chat_type") or payload.get("chat_type") or "dialog").strip()

    if not chat_id and user_id:
        chat_id = user_id

    external_id = str(body.get("mid") or message.get("mid") or "").strip()
    text = _extract_text(body)
    contact_name = " ".join(
        part
        for part in [
            str(sender.get("first_name") or "").strip(),
            str(sender.get("last_name") or "").strip(),
        ]
        if part
    ).strip()

    contact_phone = ""
    for key in ("phone", "phone_number"):
        raw = sender.get(key)
        if isinstance(raw, str) and raw.strip():
            contact_phone = raw.strip()
            break

    timestamp_ms = message.get("timestamp") or payload.get("timestamp")
    sent_at: datetime | None = None
    if timestamp_ms:
        try:
            sent_at = datetime.fromtimestamp(int(timestamp_ms) / 1000, tz=timezone.utc)
        except (TypeError, ValueError, OSError):
            sent_at = None

    return ParsedMaxMessage(
        update_type=update_type,
        external_id=external_id,
        chat_id=chat_id,
        user_id=user_id,
        chat_type=chat_type,
        contact_name=contact_name,
        contact_phone=contact_phone,
        text=text,
        sent_at=sent_at,
        raw_payload=payload,
    )


def _max_request(
    method: str,
    path: str,
    token: str,
    *,
    params: dict[str, str | int] | None = None,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    query = ""
    if params:
        query = f"?{urllib.parse.urlencode(params)}"
    body = json.dumps(payload or {}, ensure_ascii=False).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        f"{MAX_API_BASE}{path}{query}",
        data=body,
        method=method,
        headers={
            "Authorization": token,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"MAX API error: {exc.code} {detail}") from exc

    if not raw:
        return {}
    data = json.loads(raw)
    return data if isinstance(data, dict) else {"data": data}


def send_max_message(
    token: str,
    *,
    chat_id: str,
    text: str,
    user_id: str = "",
    chat_type: str = "",
) -> dict[str, Any]:
    params: dict[str, str | int] = {}
    normalized_type = (chat_type or "dialog").lower()
    if normalized_type in {"chat", "channel"} and chat_id:
        params["chat_id"] = int(chat_id)
    elif user_id:
        params["user_id"] = int(user_id)
    elif chat_id:
        params["chat_id"] = int(chat_id)
    else:
        raise ValueError("MAX recipient is missing.")

    return _max_request(
        "POST",
        "/messages",
        token,
        params=params,
        payload={"text": text},
    )


def register_max_webhook(token: str, url: str, secret: str = "") -> dict[str, Any]:
    payload: dict[str, Any] = {
        "url": url,
        "update_types": ["message_created", "bot_started"],
    }
    if secret:
        payload["secret"] = secret
    return _max_request("POST", "/subscriptions", token, payload=payload)
