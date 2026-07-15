from __future__ import annotations

import ipaddress
import random
import secrets
from typing import Any

from django.core.cache import cache
from django.http import HttpRequest

from telephony.phone import normalize_phone

CAPTCHA_TTL_SECONDS = 60
OTP_PHONE_COOLDOWN_SECONDS = 60
OTP_PHONE_HOUR_LIMIT = 5
OTP_IP_MINUTE_LIMIT = 5
OTP_IP_HOUR_LIMIT = 20


def extract_client_ip(request: HttpRequest | Any) -> str:
    meta = getattr(request, "META", {}) or {}
    candidates = [
        str(meta.get("HTTP_X_REAL_IP") or "").strip(),
        str(meta.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip(),
        str(meta.get("REMOTE_ADDR") or "").strip(),
    ]
    for candidate in candidates:
        if candidate and _is_valid_ip(candidate):
            return candidate
    return ""


def public_client_ip(request: HttpRequest | Any) -> str:
    """IP для SMS.ru (&ip=): только публичный адрес конечного пользователя."""
    ip = extract_client_ip(request)
    if not ip or _is_private_or_local_ip(ip):
        return ""
    return ip


def sms_ru_user_ip(request: HttpRequest | Any) -> str:
    """Публичный IP пользователя для параметра &ip= в SMS.ru."""
    return public_client_ip(request)


def assert_russian_mobile(phone: str) -> str:
    """Только номера РФ формата 7XXXXXXXXXX (защита от зарубежных атак)."""
    normalized = normalize_phone(phone)
    if len(normalized) != 11 or not normalized.startswith("7"):
        raise ValueError("Укажите номер российского мобильного телефона (+7…).")
    return normalized


def create_otp_captcha() -> dict[str, str | int]:
    a = random.randint(1, 9)
    b = random.randint(1, 9)
    challenge_id = secrets.token_urlsafe(18)
    cache.set(_captcha_key(challenge_id), a + b, CAPTCHA_TTL_SECONDS)
    return {
        "challenge_id": challenge_id,
        "question": f"{a} + {b}",
        "expires_in_seconds": CAPTCHA_TTL_SECONDS,
    }


def verify_otp_captcha(challenge_id: str, answer: str) -> None:
    if not challenge_id:
        raise ValueError("Сначала загрузите пример и введите ответ.")
    expected = cache.get(_captcha_key(challenge_id))
    if expected is None:
        raise ValueError("Пример обновился. Нажмите «Обновить» и введите новый ответ.")
    try:
        provided = int(str(answer).strip())
    except (TypeError, ValueError) as exc:
        raise ValueError("Введите числовой ответ на пример.") from exc
    if provided != int(expected):
        raise ValueError("Неверный ответ на проверку. Попробуйте снова.")
    cache.delete(_captcha_key(challenge_id))


def assert_honeypot_empty(value: str | None) -> None:
    if str(value or "").strip():
        raise ValueError("Запрос отклонён.")


def enforce_otp_ip_limits(*, company_slug: str, client_ip: str) -> None:
    ip = client_ip or "unknown"
    ip_min_key = f"otp_rl:ip:{company_slug}:{ip}:min"
    ip_hour_key = f"otp_rl:ip:{company_slug}:{ip}:hour"
    ip_min = int(cache.get(ip_min_key) or 0)
    ip_hour = int(cache.get(ip_hour_key) or 0)
    if ip_min >= OTP_IP_MINUTE_LIMIT:
        raise ValueError("Слишком много запросов с вашего устройства. Подождите минуту.")
    if ip_hour >= OTP_IP_HOUR_LIMIT:
        raise ValueError("Превышен лимит запросов кодов. Попробуйте позже.")
    cache.set(ip_min_key, ip_min + 1, 60)
    cache.set(ip_hour_key, ip_hour + 1, 3600)


def enforce_otp_phone_limits(*, company_slug: str, phone: str) -> None:
    phone_key = f"otp_rl:phone:{company_slug}:{phone}"
    if cache.get(f"{phone_key}:cooldown"):
        raise ValueError("Код уже отправлен. Подождите около минуты и запросите снова.")

    phone_hour = int(cache.get(f"{phone_key}:hour") or 0)
    if phone_hour >= OTP_PHONE_HOUR_LIMIT:
        raise ValueError("Слишком много запросов кода на этот номер. Попробуйте через час.")

    cache.set(f"{phone_key}:cooldown", 1, OTP_PHONE_COOLDOWN_SECONDS)
    cache.set(f"{phone_key}:hour", phone_hour + 1, 3600)


def _captcha_key(challenge_id: str) -> str:
    return f"otp_captcha:{challenge_id}"


def _is_valid_ip(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


def _is_private_or_local_ip(value: str) -> bool:
    try:
        addr = ipaddress.ip_address(value)
    except ValueError:
        return True
    return bool(addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved)
