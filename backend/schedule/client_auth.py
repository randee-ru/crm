from __future__ import annotations

import logging
import re
import secrets

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.core.validators import validate_email

from clients.models import Client
from companies.models import Company
from notifications.emitters import resolve_client_by_phone
from schedule.otp_protection import (
    assert_honeypot_empty,
    assert_russian_mobile,
    enforce_otp_ip_limits,
    enforce_otp_phone_limits,
    verify_otp_captcha,
)
from schedule.sms import (
    SmsSendError,
    get_sms_ru_callcheck_status,
    resolve_sms_ru_credentials,
    start_sms_ru_callcheck,
)
from telephony.phone import normalize_phone

logger = logging.getLogger(__name__)

SESSION_SALT = "schedule-client-session"
SESSION_MAX_AGE = 60 * 60 * 24 * 90
CALLCHECK_TTL_SECONDS = 300
PASSWORD_RESET_CACHE_PREFIX = "schedule_callcheck"
MIN_PASSWORD_LENGTH = 4


def _callcheck_cache_key(check_id: str) -> str:
    return f"{PASSWORD_RESET_CACHE_PREFIX}:{check_id}"


def _mask_phone(phone: str) -> str:
    if len(phone) >= 4:
        return f"***{phone[-4:]}"
    return "***"


def normalize_schedule_phone(phone: str) -> str:
    """Принимает +7, 7, 8 или 10 цифр — всегда возвращает 7XXXXXXXXXX."""
    return assert_russian_mobile(phone)


def _resolve_bookable_client(company: Company, phone: str) -> Client:
    normalized = normalize_schedule_phone(phone)

    client = resolve_client_by_phone(company, normalized)
    if client is None or not client.is_active or client.is_deleted:
        raise ValueError("Клиент с таким номером не найден. Обратитесь в клуб для регистрации.")
    if client.club_access_blocked:
        raise ValueError("Доступ в клуб ограничен. Обратитесь на ресепшен.")
    if client.group_programs_blocked:
        raise ValueError("Запись на групповые занятия недоступна. Обратитесь в клуб.")
    return client


def _validate_password(password: str) -> str:
    value = str(password or "").strip()
    if len(value) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Пароль должен быть не короче {MIN_PASSWORD_LENGTH} символов.")
    return value


def _validate_email(email: str) -> str:
    value = str(email or "").strip().lower()
    if not value:
        raise ValueError("Укажите email.")
    try:
        validate_email(value)
    except ValidationError as exc:
        raise ValueError("Укажите корректный email.") from exc
    return value


def set_client_portal_password(client: Client, password: str) -> None:
    client.schedule_portal_password = make_password(_validate_password(password))
    client.save(update_fields=["schedule_portal_password", "updated_at"])


def check_client_portal_password(client: Client, password: str) -> bool:
    if not client.schedule_portal_password:
        return False
    return check_password(str(password or ""), client.schedule_portal_password)


def create_client_session_token(company_id: int, client_id: int) -> str:
    signer = TimestampSigner(salt=SESSION_SALT)
    return signer.sign(f"{company_id}:{client_id}")


def _session_payload(client: Client) -> dict[str, str | int]:
    return {
        "session_token": create_client_session_token(client.company_id, client.id),
        "client_id": client.id,
        "client_name": client.full_name,
        "phone": client.phone,
    }


def login_schedule_portal(company: Company, phone: str, password: str) -> dict[str, str | int]:
    client = _resolve_bookable_client(company, phone)
    if not client.schedule_portal_password:
        raise ValueError("Пароль ещё не задан. Нажмите «Забыли пароль?» и подтвердите номер звонком.")
    if not check_client_portal_password(client, password):
        raise ValueError("Неверный логин или пароль.")
    return _session_payload(client)


def _store_callcheck(
    *,
    check_id: str,
    company: Company,
    client: Client,
    phone: str,
    call_phone: str,
    call_phone_pretty: str,
    call_phone_html: str,
    confirmed: bool = False,
) -> None:
    cache.set(
        _callcheck_cache_key(check_id),
        {
            "company_id": company.id,
            "company_slug": company.slug,
            "client_id": client.id,
            "phone": phone,
            "call_phone": call_phone,
            "call_phone_pretty": call_phone_pretty,
            "call_phone_html": call_phone_html,
            "confirmed": confirmed,
        },
        CALLCHECK_TTL_SECONDS,
    )


def _load_callcheck(check_id: str) -> dict | None:
    payload = cache.get(_callcheck_cache_key(check_id))
    return payload if isinstance(payload, dict) else None


def request_password_reset(
    company: Company,
    phone: str,
    *,
    user_ip: str = "",
    challenge_id: str = "",
    captcha_answer: str = "",
    honeypot: str = "",
) -> dict[str, str]:
    """Старт подтверждения номера звонком (SMS.ru CallCheck)."""
    assert_honeypot_empty(honeypot)
    verify_otp_captcha(challenge_id, captcha_answer)
    enforce_otp_ip_limits(company_slug=company.slug, client_ip=user_ip)

    client = _resolve_bookable_client(company, phone)
    normalized = normalize_phone(phone)
    enforce_otp_phone_limits(company_slug=company.slug, phone=normalized)

    credentials = resolve_sms_ru_credentials(company)
    if credentials is None:
        if not settings.DEBUG:
            raise ValueError("Подтверждение звонком временно недоступно. Обратитесь в клуб.")
        check_id = f"debug-{secrets.token_urlsafe(8)}"
        call_phone = "78005008275"
        call_phone_pretty = "+7 (800) 500-8275"
        _store_callcheck(
            check_id=check_id,
            company=company,
            client=client,
            phone=normalized,
            call_phone=call_phone,
            call_phone_pretty=call_phone_pretty,
            call_phone_html=call_phone_pretty,
            confirmed=True,
        )
        return {
            "detail": "Тестовый режим: звонок считается подтверждённым. Задайте email и пароль.",
            "phone_mask": _mask_phone(normalized),
            "check_id": check_id,
            "call_phone": call_phone,
            "call_phone_pretty": call_phone_pretty,
            "call_phone_html": call_phone_pretty,
            "status": "confirmed",
            "debug_confirmed": "1",
        }

    api_id, _sender = credentials
    try:
        call = start_sms_ru_callcheck(api_id=api_id, phone=normalized)
    except SmsSendError as exc:
        logger.exception("Failed to start CallCheck for %s", company.slug)
        raise ValueError(f"Не удалось начать проверку звонком: {exc}") from exc

    _store_callcheck(
        check_id=call["check_id"],
        company=company,
        client=client,
        phone=normalized,
        call_phone=call["call_phone"],
        call_phone_pretty=call["call_phone_pretty"],
        call_phone_html=call["call_phone_html"],
        confirmed=False,
    )
    return {
        "detail": "Позвоните на указанный номер со своего телефона. Звонок бесплатный, можно сбросить.",
        "phone_mask": _mask_phone(normalized),
        "check_id": call["check_id"],
        "call_phone": call["call_phone"],
        "call_phone_pretty": call["call_phone_pretty"],
        "call_phone_html": call["call_phone_html"],
        "status": "pending",
    }


def poll_callcheck_status(company: Company, check_id: str) -> dict[str, str | bool]:
    check_id = str(check_id or "").strip()
    if not check_id:
        raise ValueError("Не указан идентификатор проверки.")

    stored = _load_callcheck(check_id)
    if stored is None:
        raise ValueError("Проверка истекла. Начните подтверждение заново.")
    if int(stored.get("company_id") or 0) != company.id:
        raise ValueError("Проверка не найдена.")

    if stored.get("confirmed"):
        return {
            "status": "confirmed",
            "detail": "Номер подтверждён. Задайте email и пароль.",
            "check_id": check_id,
            "call_phone_pretty": str(stored.get("call_phone_pretty") or ""),
        }

    credentials = resolve_sms_ru_credentials(company)
    if credentials is None:
        raise ValueError("Подтверждение звонком временно недоступно.")

    api_id, _sender = credentials
    try:
        status = get_sms_ru_callcheck_status(api_id=api_id, check_id=check_id)
    except SmsSendError as exc:
        raise ValueError(f"Не удалось проверить звонок: {exc}") from exc

    if status["confirmed"]:
        stored["confirmed"] = True
        cache.set(_callcheck_cache_key(check_id), stored, CALLCHECK_TTL_SECONDS)
        return {
            "status": "confirmed",
            "detail": "Номер подтверждён. Задайте email и пароль.",
            "check_id": check_id,
            "call_phone_pretty": str(stored.get("call_phone_pretty") or ""),
        }
    if status["expired"]:
        cache.delete(_callcheck_cache_key(check_id))
        raise ValueError("Время на звонок истекло. Начните подтверждение заново.")

    return {
        "status": "pending",
        "detail": "Ждём звонок с вашего номера…",
        "check_id": check_id,
        "call_phone_pretty": str(stored.get("call_phone_pretty") or ""),
    }


def reset_schedule_password(
    company: Company,
    phone: str,
    check_id: str,
    new_password: str,
    *,
    email: str = "",
) -> dict[str, str | int]:
    normalized = normalize_schedule_phone(phone)
    check_id = str(check_id or "").strip()
    stored = _load_callcheck(check_id)
    if stored is None:
        raise ValueError("Проверка истекла. Подтвердите номер звонком ещё раз.")
    if int(stored.get("company_id") or 0) != company.id:
        raise ValueError("Проверка не найдена.")
    if str(stored.get("phone") or "") != normalized:
        raise ValueError("Номер телефона не совпадает с проверкой.")

    if not stored.get("confirmed"):
        # На всякий случай один раз перепроверим у SMS.ru.
        poll = poll_callcheck_status(company, check_id)
        if poll.get("status") != "confirmed":
            raise ValueError("Сначала подтвердите номер звонком.")
        stored = _load_callcheck(check_id) or stored

    email_value = _validate_email(email)
    client = _resolve_bookable_client(company, phone)
    if int(stored.get("client_id") or 0) != client.id:
        raise ValueError("Клиент не совпадает с проверкой.")

    set_client_portal_password(client, new_password)
    if client.email != email_value:
        client.email = email_value
        client.save(update_fields=["email", "updated_at"])

    cache.delete(_callcheck_cache_key(check_id))
    return _session_payload(client)


# Совместимость со старым OTP-входом (используется только в тестах/legacy).
def request_schedule_otp(
    company: Company,
    phone: str,
    *,
    user_ip: str = "",
    challenge_id: str = "",
    captcha_answer: str = "",
    honeypot: str = "",
) -> dict[str, str]:
    return request_password_reset(
        company,
        phone,
        user_ip=user_ip,
        challenge_id=challenge_id,
        captcha_answer=captcha_answer,
        honeypot=honeypot,
    )


def verify_schedule_otp(company: Company, phone: str, code: str) -> dict[str, str | int]:
    # Legacy: после CallCheck check_id передаётся как code, email не обязателен для старого пути.
    raise ValueError("Используйте подтверждение звонком и установку пароля.")


def resolve_client_session(company: Company, token: str) -> Client | None:
    if not token:
        return None
    signer = TimestampSigner(salt=SESSION_SALT)
    try:
        payload = signer.unsign(token, max_age=SESSION_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None

    parts = str(payload).split(":")
    if len(parts) != 2:
        return None
    try:
        company_id = int(parts[0])
        client_id = int(parts[1])
    except ValueError:
        return None
    if company_id != company.id:
        return None
    return Client.objects.filter(
        id=client_id,
        company=company,
        is_active=True,
        is_deleted=False,
    ).first()


def display_phone_hint(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) == 11 and digits.startswith("7"):
        return f"+7 ({digits[1:4]}) {digits[4:7]}-{digits[7:9]}-{digits[9:11]}"
    return phone
