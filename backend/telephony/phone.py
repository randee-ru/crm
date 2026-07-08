from __future__ import annotations

import re


def normalize_phone(value: str | None) -> str:
    digits = re.sub(r"\D", "", value or "")
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


def phone_tail(value: str | None) -> str:
    normalized = normalize_phone(value)
    return normalized[-10:] if len(normalized) >= 10 else normalized
