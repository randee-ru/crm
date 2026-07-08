from __future__ import annotations

import uuid
from typing import Any

from django.contrib.auth import get_user_model

from companies.models import Company
from telephony.lines import MAIN_LINE_NUMBER
from telephony.mango_client import MangoConfig, call_mango_api, resolve_mango_config
from telephony.models import TelephonyIntegration
from telephony.phone import normalize_phone

User = get_user_model()


def _integration_settings(integration: TelephonyIntegration) -> dict[str, Any]:
    return integration.settings if isinstance(integration.settings, dict) else {}


def resolve_mango_extension_for_user(config: MangoConfig, user: User) -> str:
    try:
        payload = call_mango_api(config, "/config/users/request", {})
    except Exception:
        return ""

    users = payload.get("users") if isinstance(payload, dict) else payload
    if not isinstance(users, list):
        return ""

    user_email = (user.email or "").strip().lower()
    user_name = (user.get_full_name() or user.username or "").strip().lower()

    for entry in users:
        if not isinstance(entry, dict):
            continue
        general = entry.get("general") if isinstance(entry.get("general"), dict) else {}
        telephony = entry.get("telephony") if isinstance(entry.get("telephony"), dict) else {}
        extension = str(telephony.get("extension") or "").strip()
        if not extension:
            continue

        email = str(general.get("email") or "").strip().lower()
        name = str(general.get("name") or "").strip().lower()
        if user_email and email and user_email == email:
            return extension
        if user_name and name and (user_name in name or name in user_name):
            return extension

    return ""


def resolve_click_to_call_extension(integration: TelephonyIntegration, user: User, config: MangoConfig) -> str:
    settings = _integration_settings(integration)
    user_extensions = settings.get("user_extensions")
    if isinstance(user_extensions, dict):
        explicit = str(user_extensions.get(str(user.pk)) or user_extensions.get(user.email or "") or "").strip()
        if explicit:
            return explicit

    default_extension = str(settings.get("click_to_call_extension") or "").strip()
    if default_extension:
        return default_extension

    return resolve_mango_extension_for_user(config, user)


def resolve_click_to_call_line(integration: TelephonyIntegration) -> str:
    settings = _integration_settings(integration)
    line = str(settings.get("click_to_call_line") or "").strip()
    return normalize_phone(line) or line or MAIN_LINE_NUMBER


def initiate_mango_callback(
    config: MangoConfig,
    *,
    extension: str,
    to_number: str,
    line_number: str = "",
) -> dict[str, Any]:
    normalized = normalize_phone(to_number)
    if len(normalized) < 10:
        raise RuntimeError("Некорректный номер телефона")

    payload: dict[str, Any] = {
        "command_id": f"crm-{uuid.uuid4().hex[:16]}",
        "from": {"extension": str(extension).strip()},
        "to_number": normalized,
    }
    line = normalize_phone(line_number) or str(line_number or "").strip()
    if line:
        payload["line_number"] = line

    result = call_mango_api(config, "/commands/callback", payload)
    if isinstance(result, dict) and result.get("result") not in (None, 0, 1000):
        raise RuntimeError(f"Mango Office: не удалось инициировать звонок (код {result.get('result')})")
    return result if isinstance(result, dict) else {"result": 0}


def click_to_call(
    company: Company,
    user: User,
    *,
    phone: str,
    extension: str = "",
) -> dict[str, Any]:
    integration = TelephonyIntegration.objects.filter(company=company, is_active=True).first()
    if integration is None:
        raise RuntimeError("Телефония не настроена")

    config = resolve_mango_config(integration)
    if config is None:
        raise RuntimeError("Mango Office не настроен")

    resolved_extension = (extension or "").strip() or resolve_click_to_call_extension(integration, user, config)
    if not resolved_extension:
        raise RuntimeError(
            "Не найден внутренний номер Mango для вашего пользователя. "
            "Укажите его в Настройки → Телефония → Внутренний номер."
        )

    line_number = resolve_click_to_call_line(integration)
    result = initiate_mango_callback(
        config,
        extension=resolved_extension,
        to_number=phone,
        line_number=line_number,
    )

    return {
        "status": "ok",
        "extension": resolved_extension,
        "to_number": normalize_phone(phone),
        "line_number": line_number,
        "mango_result": result,
    }
