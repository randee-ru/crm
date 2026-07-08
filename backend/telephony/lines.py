from __future__ import annotations

import re
from typing import Any

from django.db.models import Q, QuerySet

from telephony.mango_client import MangoCall, MangoConfig, call_mango_api
from telephony.phone import normalize_phone

SIP_USER_PATTERN = re.compile(r"user(\d+)@", re.IGNORECASE)
FMC_PATTERN = re.compile(r"fmc:(\d+)", re.IGNORECASE)

MAIN_LINE_NUMBER = "74951203639"
MOBILE_LINE_NUMBERS = frozenset({"79330914404", "79330910414"})

FALLBACK_LINE_LABELS: dict[str, str] = {
    MAIN_LINE_NUMBER: "База Ресепшн",
    "79330914404": "Ксения сим",
    "79330910414": "Александра сим",
}

FALLBACK_SIP_LABELS: dict[str, str] = {
    "user1": "База Ресепшн",
    "user2": "Ксения сим",
    "user3": "Менеджеры",
}

DISPLAY_LINES: tuple[dict[str, Any], ...] = (
    {
        "key": "reception",
        "label": "База Ресепшн",
        "sip": "user1",
        "numbers": [MAIN_LINE_NUMBER],
    },
    {
        "key": "managers",
        "label": "Менеджеры",
        "sip": "user3",
        "numbers": [MAIN_LINE_NUMBER],
    },
    {
        "key": "ksenia",
        "label": "Ксения сим",
        "sip": "user2",
        "numbers": ["79330914404"],
    },
    {
        "key": "alexandra",
        "label": "Александра сим",
        "sip": None,
        "numbers": ["79330910414"],
    },
)


def extract_sip_user(*values: str | None) -> str:
    for value in values:
        if not value:
            continue
        match = SIP_USER_PATTERN.search(value)
        if match:
            return f"user{match.group(1)}"
    return ""


def extract_fmc_number(*values: str | None) -> str:
    for value in values:
        if not value:
            continue
        match = FMC_PATTERN.search(value)
        if match:
            digits = normalize_phone(match.group(1))
            if digits.startswith("8") and len(digits) == 11:
                return f"7{digits[1:]}"
            return digits
    return ""


def normalize_line_number(value: str | None) -> str:
    digits = normalize_phone(value or "")
    if digits.startswith("8") and len(digits) == 11:
        return f"7{digits[1:]}"
    return digits


def normalize_person_label(label: str) -> str:
    cleaned = (label or "").strip()
    if not cleaned:
        return cleaned
    if cleaned == "Ксения":
        return "Ксения сим"
    if cleaned == "Александра":
        return "Александра сим"
    if cleaned == "База Ресепшен":
        return "База Ресепшн"
    return cleaned


def format_phone_display(value: str) -> str:
    digits = normalize_line_number(value)
    if len(digits) == 11 and digits.startswith("7"):
        return f"+7 {digits[1:4]} {digits[4:7]}-{digits[7:9]}-{digits[9:11]}"
    return value


def fetch_mango_line_directory(config: MangoConfig) -> dict[str, Any]:
    directory: dict[str, Any] = {
        "sip": dict(FALLBACK_SIP_LABELS),
        "numbers": dict(FALLBACK_LINE_LABELS),
        "schemas": {},
        "display_lines": [dict(item) for item in DISPLAY_LINES],
    }

    try:
        users_payload = call_mango_api(config, "/config/users/request", {})
        users = users_payload.get("users") if isinstance(users_payload, dict) else users_payload
        if isinstance(users, list):
            for user in users:
                if not isinstance(user, dict):
                    continue
                general = user.get("general") if isinstance(user.get("general"), dict) else {}
                telephony = user.get("telephony") if isinstance(user.get("telephony"), dict) else {}
                label = normalize_person_label(str(general.get("name") or "").strip())
                if not label:
                    continue
                for number in telephony.get("numbers") or []:
                    if not isinstance(number, dict):
                        continue
                    raw_number = str(number.get("number") or "")
                    sip_user = extract_sip_user(raw_number)
                    if sip_user:
                        directory["sip"][sip_user] = label
                    mobile = normalize_line_number(raw_number)
                    if mobile in MOBILE_LINE_NUMBERS:
                        directory["numbers"][mobile] = label
                outgoing = normalize_line_number(str(telephony.get("outgoingline") or ""))
                if outgoing and label:
                    if outgoing in MOBILE_LINE_NUMBERS or outgoing not in directory["numbers"]:
                        directory["numbers"][outgoing] = label
    except Exception:
        pass

    try:
        lines_payload = call_mango_api(config, "/incominglines", {})
        lines = lines_payload.get("lines") if isinstance(lines_payload, dict) else None
        if isinstance(lines, list):
            for line in lines:
                if not isinstance(line, dict):
                    continue
                number = normalize_line_number(str(line.get("number") or ""))
                if not number:
                    continue
                schema_name = str(line.get("schema_name") or "").strip()
                if not schema_name:
                    continue
                if number in MOBILE_LINE_NUMBERS:
                    continue
                directory["numbers"][number] = schema_name
                directory["schemas"][number] = schema_name
    except Exception:
        pass

    return directory


def resolve_line_label(
    *,
    line_number: str = "",
    from_number: str = "",
    to_number: str = "",
    existing_line_name: str = "",
    line_directory: dict[str, Any] | None = None,
) -> str:
    directory = line_directory or {}
    sip_labels: dict[str, str] = {
        key: normalize_person_label(value)
        for key, value in {**FALLBACK_SIP_LABELS, **(directory.get("sip") or {})}.items()
    }
    number_labels: dict[str, str] = {
        key: normalize_person_label(value)
        for key, value in {**FALLBACK_LINE_LABELS, **(directory.get("numbers") or {})}.items()
    }

    normalized_line = normalize_line_number(line_number)
    fmc_number = extract_fmc_number(from_number, to_number)

    for candidate in (fmc_number, normalized_line):
        if candidate and candidate in number_labels:
            label = number_labels[candidate]
            if candidate in MOBILE_LINE_NUMBERS or label not in {"По умолчанию", "Mango Office"}:
                return label

    for value in (from_number, to_number):
        candidate = normalize_line_number(value)
        if candidate in MOBILE_LINE_NUMBERS and candidate in number_labels:
            return number_labels[candidate]

    sip_user = extract_sip_user(from_number, to_number)
    if sip_user and sip_user in sip_labels:
        return sip_labels[sip_user]

    if not normalized_line:
        for value in (from_number, to_number):
            candidate = normalize_line_number(value)
            if candidate in number_labels:
                normalized_line = candidate
                break

    if normalized_line and normalized_line in number_labels:
        return number_labels[normalized_line]

    existing = normalize_person_label(existing_line_name)
    if existing and existing not in {"Mango Office", "По умолчанию"}:
        return existing

    if normalized_line:
        return number_labels.get(normalized_line, existing or "Mango Office")

    return existing or "Mango Office"


def resolve_line_number_for_display(
    *,
    line_number: str = "",
    from_number: str = "",
    to_number: str = "",
) -> str:
    normalized_line = normalize_line_number(line_number)
    fmc_number = extract_fmc_number(from_number, to_number)
    if fmc_number in MOBILE_LINE_NUMBERS:
        return fmc_number
    if normalized_line in MOBILE_LINE_NUMBERS:
        return normalized_line
    for value in (from_number, to_number):
        candidate = normalize_line_number(value)
        if candidate in MOBILE_LINE_NUMBERS:
            return candidate
    return normalized_line


def resolve_call_log_line_display(call, line_directory: dict[str, Any] | None = None) -> str:
    label = resolve_line_label(
        line_number=call.line_number,
        from_number=call.from_number,
        to_number=call.to_number,
        existing_line_name=call.line_name,
        line_directory=line_directory,
    )
    number = resolve_line_number_for_display(
        line_number=call.line_number,
        from_number=call.from_number,
        to_number=call.to_number,
    )
    if number in MOBILE_LINE_NUMBERS:
        return f"{label} · {format_phone_display(number)}"
    return label


def resolve_mango_call_line_name(call: MangoCall, line_directory: dict[str, Any] | None = None, existing_line_name: str = "") -> str:
    return resolve_line_label(
        line_number=call.line_number,
        from_number=call.from_number,
        to_number=call.to_number,
        existing_line_name=existing_line_name,
        line_directory=line_directory,
    )


def is_managers_line(line_name: str | None) -> bool:
    return (line_name or "").strip() == "Менеджеры"


def filter_calls_by_line_key(queryset: QuerySet, line_key: str) -> QuerySet:
    config = next((item for item in DISPLAY_LINES if item["key"] == line_key), None)
    if config is None:
        return queryset

    if line_key == "reception":
        return queryset.filter(
            Q(from_number__icontains="user1@")
            | Q(to_number__icontains="user1@")
            | Q(line_name__icontains="Ресепш")
        )

    if line_key == "managers":
        return queryset.filter(
            Q(from_number__icontains="user3@")
            | Q(to_number__icontains="user3@")
            | Q(line_name="Менеджеры")
        )

    condition = Q()
    for number in config.get("numbers") or []:
        if number == MAIN_LINE_NUMBER:
            continue
        tail = number[-10:]
        condition |= Q(line_number=number)
        condition |= Q(from_number__icontains=tail) | Q(to_number__icontains=tail)
        condition |= Q(from_number__icontains=f"fmc:8{tail}") | Q(to_number__icontains=f"fmc:8{tail}")
        condition |= Q(from_number__icontains=f"fmc:7{tail}") | Q(to_number__icontains=f"fmc:7{tail}")

    sip = config.get("sip")
    if sip:
        condition |= Q(from_number__icontains=f"{sip}@") | Q(to_number__icontains=f"{sip}@")

    label = str(config.get("label") or "")
    if label:
        condition |= Q(line_name__icontains=label.split()[0])

    if line_key == "ksenia":
        condition |= Q(line_name__icontains="Ксения")
    elif line_key == "alexandra":
        condition |= Q(line_name__icontains="Александра")

    if not condition:
        return queryset
    return queryset.filter(condition)


def summarize_line_counts(calls: QuerySet, line_directory: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    del line_directory
    return [
        {
            "key": item["key"],
            "label": item["label"],
            "number": next(
                (number for number in (item.get("numbers") or []) if number != MAIN_LINE_NUMBER),
                (item.get("numbers") or [None])[0],
            ),
            "count": filter_calls_by_line_key(calls, item["key"]).count(),
        }
        for item in DISPLAY_LINES
    ]
