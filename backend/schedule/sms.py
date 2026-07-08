from __future__ import annotations

import json
import logging
import secrets
from typing import Any
from urllib import error, parse, request

from django.conf import settings
from django.utils import timezone

from clients.models import Client, ClientMessage
from companies.models import Company
from notifications.emitters import resolve_client_by_phone
from schedule.models import ScheduleSmsIntegration
from telephony.phone import normalize_phone

logger = logging.getLogger(__name__)

SMS_RU_SEND_URL = "https://sms.ru/sms/send"

# Коды из https://sms.ru/api/send
SMS_RU_ERROR_TEXTS: dict[int, str] = {
    200: "Неправильный api_id",
    201: "Не хватает средств на счёте SMS.ru",
    202: "Неправильный номер телефона",
    203: "Нет текста сообщения",
    204: "Не удалось отправить SMS. Попробуйте позже.",
    205: "Сообщение слишком длинное",
    206: "Превышен дневной лимит отправки",
    207: "На этот номер нет маршрута доставки",
    209: "Номер в стоп-листе",
    212: "Текст нужно передавать в UTF-8",
    214: "Номер зарубежный (включена отправка только по РФ)",
    215: "Номер в стоп-листе SMS.ru",
    216: "В тексте есть запрещённое слово",
    220: "Сервис временно недоступен",
    221: "Нужно создать буквенного отправителя в SMS.ru",
    222: "Сообщение не входит в одобренные шаблоны",
    230: "Превышен дневной лимит сообщений на этот номер",
    231: "Слишком много одинаковых сообщений на номер (в минуту)",
    232: "Слишком много одинаковых сообщений на номер (в день)",
    233: "Слишком частые коды на этот номер (защита SMS.ru)",
    301: "Неверный api_id / логин",
    500: "Ошибка сервера SMS.ru",
    505: "Превышен лимит сообщений с одного IP",
    506: "Похоже на запросы ботов (хостинговый IP)",
    507: "IP пользователя указан неверно (частная сеть)",
}


class SmsSendError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


def get_primary_sms_integration(company: Company) -> ScheduleSmsIntegration | None:
    return (
        ScheduleSmsIntegration.objects.filter(
            company=company,
            is_active=True,
            provider=ScheduleSmsIntegration.Provider.SMS_RU,
        )
        .order_by("-is_primary", "id")
        .first()
    )


def fetch_sms_ru_senders(api_id: str) -> list[str]:
    """Список имён отправителей из личного кабинета SMS.ru."""
    params = parse.urlencode({"api_id": api_id, "json": "1"}).encode("utf-8")
    req = request.Request(
        "https://sms.ru/my/senders",
        data=params,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with request.urlopen(req, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (error.URLError, error.HTTPError, json.JSONDecodeError):
        return []
    if not isinstance(payload, dict) or str(payload.get("status", "")).upper() != "OK":
        return []
    senders = payload.get("senders")
    if not isinstance(senders, list):
        return []
    return [str(item).strip() for item in senders if str(item).strip()]


def resolve_sms_ru_credentials(company: Company) -> tuple[str, str] | None:
    """
    Возвращает (api_id, sender_name).
    Пустой sender_name — отправка через стандартного SMS.ru без ежемесячной платы за имя.
    """
    integration = get_primary_sms_integration(company)
    if integration is not None and integration.api_key:
        return integration.api_key, (integration.sender_name or "").strip()

    env_api_id = getattr(settings, "SMS_RU_API_ID", "") or ""
    if env_api_id.strip():
        return env_api_id.strip(), ""

    return None


def format_otp_message(code: str, *, company_name: str = "") -> str:
    club = company_name.strip() or "клуба"
    return f"Код для записи на занятия {club}: {code}. Не сообщайте его никому."


def format_password_reset_message(code: str, *, company_name: str = "") -> str:
    club = company_name.strip() or "клуба"
    return f"Код для сброса пароля {club}: {code}. Не сообщайте его никому."


def start_sms_ru_callcheck(*, api_id: str, phone: str) -> dict[str, Any]:
    """
    SMS.ru CallCheck: ожидание звонка с номера клиента.
    https://sms.ru/api/call
    """
    digits = assert_sms_ru_destination(phone)
    params = parse.urlencode({"api_id": api_id, "phone": digits, "json": "1"}).encode("utf-8")
    req = request.Request(
        "https://sms.ru/callcheck/add",
        data=params,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with request.urlopen(req, timeout=15) as response:
            raw = response.read().decode("utf-8")
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise SmsSendError(f"SMS.ru CallCheck HTTP {exc.code}: {detail}") from exc
    except error.URLError as exc:
        raise SmsSendError(f"SMS.ru недоступен: {exc.reason}") from exc

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SmsSendError(f"Некорректный ответ CallCheck: {raw[:200]}") from exc

    if not isinstance(payload, dict):
        raise SmsSendError("Некорректный JSON-ответ CallCheck")

    status = str(payload.get("status") or "").upper()
    status_code = _to_int(payload.get("status_code"))
    if status != "OK" or status_code != 100:
        raise SmsSendError(
            _error_text(status_code, str(payload.get("status_text") or "Не удалось начать проверку звонком")),
            status_code=status_code,
        )

    check_id = str(payload.get("check_id") or "").strip()
    call_phone = str(payload.get("call_phone") or "").strip()
    call_phone_pretty = str(payload.get("call_phone_pretty") or call_phone).strip()
    call_phone_html = str(payload.get("call_phone_html") or call_phone_pretty).strip()
    if not check_id or not call_phone:
        raise SmsSendError("SMS.ru не вернул номер для звонка")

    return {
        "check_id": check_id,
        "call_phone": call_phone,
        "call_phone_pretty": call_phone_pretty,
        "call_phone_html": call_phone_html,
        "phone": digits,
    }


def get_sms_ru_callcheck_status(*, api_id: str, check_id: str) -> dict[str, Any]:
    """Статус CallCheck: 400 ожидание, 401 подтверждён, 402 истёк."""
    params = parse.urlencode({"api_id": api_id, "check_id": check_id, "json": "1"}).encode("utf-8")
    req = request.Request(
        "https://sms.ru/callcheck/status",
        data=params,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with request.urlopen(req, timeout=15) as response:
            raw = response.read().decode("utf-8")
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise SmsSendError(f"SMS.ru CallCheck status HTTP {exc.code}: {detail}") from exc
    except error.URLError as exc:
        raise SmsSendError(f"SMS.ru недоступен: {exc.reason}") from exc

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SmsSendError(f"Некорректный ответ CallCheck status: {raw[:200]}") from exc

    if not isinstance(payload, dict):
        raise SmsSendError("Некорректный JSON-ответ CallCheck status")

    top_status = str(payload.get("status") or "").upper()
    top_code = _to_int(payload.get("status_code"))
    if top_status != "OK":
        raise SmsSendError(
            _error_text(top_code, str(payload.get("status_text") or "Ошибка проверки звонка")),
            status_code=top_code,
        )

    check_status = str(payload.get("check_status") or payload.get("status_code") or "").strip()
    return {
        "check_status": check_status,
        "check_status_text": str(payload.get("check_status_text") or "").strip(),
        "confirmed": check_status == "401",
        "pending": check_status == "400",
        "expired": check_status == "402",
    }


def format_enrollment_confirmation_message(
    *,
    company_name: str,
    class_title: str,
    session_date: str,
    start_time: str,
    status: str,
) -> str:
    club = company_name.strip() or "Клуб"
    time_label = start_time[:5] if start_time else ""
    date_label = session_date
    if status == "waitlist":
        return (
            f"{club}: вы в листе ожидания на «{class_title}» "
            f"{date_label} в {time_label}. Ждём вас, если освободится место."
        )
    return (
        f"{club}: запись подтверждена — «{class_title}» "
        f"{date_label} в {time_label}. До встречи на тренировке!"
    )


def normalize_sms_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if not digits:
        return ""
    if len(digits) == 11 and digits.startswith("8"):
        return f"7{digits[1:]}"
    if len(digits) == 11 and digits.startswith("7"):
        return digits
    if len(digits) == 10 and digits.startswith("8"):
        return f"7{digits[1:]}"
    if len(digits) == 10 and digits.startswith("7"):
        return digits
    if len(digits) == 10:
        return f"7{digits}"
    return digits


def assert_sms_ru_destination(phone: str) -> str:
    digits = normalize_sms_phone(phone)
    if len(digits) != 11 or not digits.startswith("7"):
        raise SmsSendError("Неправильный номер телефона", status_code=202)
    return digits


def _is_public_ip(value: str) -> bool:
    if not value:
        return False
    # SMS.ru отклоняет частные/локальные IP кодом 507.
    if value.startswith(("127.", "10.", "192.168.", "169.254.")):
        return False
    if value.startswith("172."):
        try:
            second = int(value.split(".")[1])
        except (IndexError, ValueError):
            return False
        if 16 <= second <= 31:
            return False
    return True


def _error_text(status_code: int | None, fallback: str = "") -> str:
    if status_code is None:
        return fallback or "Ошибка отправки SMS"
    return SMS_RU_ERROR_TEXTS.get(status_code, fallback or f"Ошибка SMS.ru ({status_code})")


def send_sms_via_sms_ru(
    *,
    api_id: str,
    phone: str,
    message: str,
    sender: str = "",
    user_ip: str = "",
) -> dict[str, Any]:
    """
    Отправка по официальному API:
    POST https://sms.ru/sms/send
    api_id, to, msg, json=1 [, from, ip]
    """
    digits = assert_sms_ru_destination(phone)

    params: dict[str, str] = {
        "api_id": api_id,
        "to": digits,
        "msg": message,
        "json": "1",
    }
    if sender:
        params["from"] = sender
    # Для OTP SMS.ru рекомендует передавать IP конечного пользователя.
    if _is_public_ip(user_ip):
        params["ip"] = user_ip
    elif user_ip:
        logger.info("SMS.ru ip skipped (non-public): %s", user_ip)
    else:
        logger.warning("SMS.ru ip not provided — antifraud protection will be weaker")

    body = parse.urlencode(params).encode("utf-8")
    req = request.Request(
        SMS_RU_SEND_URL,
        data=body,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with request.urlopen(req, timeout=15) as response:
            raw = response.read().decode("utf-8")
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise SmsSendError(f"SMS.ru HTTP {exc.code}: {detail}") from exc
    except error.URLError as exc:
        raise SmsSendError(f"SMS.ru недоступен: {exc.reason}") from exc

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SmsSendError(f"Некорректный ответ SMS.ru: {raw[:200]}") from exc

    if not isinstance(payload, dict):
        raise SmsSendError("Некорректный JSON-ответ SMS.ru")

    top_status = str(payload.get("status") or "").upper()
    top_code = _to_int(payload.get("status_code"))
    if top_status != "OK":
        raise SmsSendError(
            _error_text(top_code, str(payload.get("status_text") or "")),
            status_code=top_code,
        )

    sms_map = payload.get("sms")
    if isinstance(sms_map, dict):
        item = sms_map.get(digits) or next(iter(sms_map.values()), None)
        if isinstance(item, dict):
            item_status = str(item.get("status") or "").upper()
            item_code = _to_int(item.get("status_code"))
            if item_status != "OK":
                raise SmsSendError(
                    _error_text(item_code, str(item.get("status_text") or "")),
                    status_code=item_code,
                )

    return payload


def _to_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _extract_sms_ru_message_id(payload: dict[str, Any], phone_digits: str) -> str:
    sms_map = payload.get("sms")
    if isinstance(sms_map, dict):
        item = sms_map.get(phone_digits) or next(iter(sms_map.values()), None)
        if isinstance(item, dict):
            sms_id = str(item.get("sms_id") or "").strip()
            if sms_id:
                return sms_id
    return secrets.token_urlsafe(12)


def log_client_sms_message(
    *,
    company: Company,
    phone: str,
    body: str,
    external_key: str,
    client: Client | None = None,
    purpose: str = "schedule",
) -> ClientMessage | None:
    if client is None:
        normalized = normalize_phone(phone)
        if normalized:
            client = resolve_client_by_phone(company, normalized)
    if client is None:
        return None

    return ClientMessage.objects.create(
        company=company,
        client=client,
        external_key=external_key,
        channel="sms_ru",
        message_type="sms",
        kind="outbound",
        source=purpose,
        phone=normalize_phone(phone) or phone,
        body=body,
        sent_at=timezone.now(),
    )


def send_company_sms(
    company: Company,
    phone: str,
    message: str,
    *,
    user_ip: str = "",
    client: Client | None = None,
    purpose: str = "schedule",
) -> bool:
    """Отправляет SMS через основную интеграцию компании. True при успехе."""
    credentials = resolve_sms_ru_credentials(company)
    if credentials is None:
        return False

    api_id, sender = credentials
    phone_digits = assert_sms_ru_destination(phone)
    payload = send_sms_via_sms_ru(
        api_id=api_id,
        phone=phone,
        message=message,
        sender=sender,
        user_ip=user_ip,
    )
    logger.info(
        "SMS sent via SMS.ru for company=%s phone=***%s sender=%s",
        company.slug,
        phone[-4:],
        sender or "default",
    )
    try:
        external_key = f"schedule:sms:{_extract_sms_ru_message_id(payload, phone_digits)}"
        log_client_sms_message(
            company=company,
            phone=phone,
            body=message,
            external_key=external_key,
            client=client,
            purpose=purpose,
        )
    except Exception:
        logger.exception("Failed to log SMS in client card for company=%s", company.slug)
    return True
