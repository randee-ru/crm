from __future__ import annotations

import re

from django.db.models import Expression, Value
from django.db.models.functions import Replace


def normalize_search(search: str | None) -> tuple[str, str]:
    value = (search or "").strip()
    digits = re.sub(r"\D+", "", value)
    return value, digits


def split_search_terms(search: str) -> list[str]:
    terms = []
    for raw_term in re.split(r"\s+", search.strip()):
        term = raw_term.strip(".,;:!?()[]{}<>\"'`")
        if len(term) >= 2:
            terms.append(term)
    return terms


def digits_only(expression: Expression | str) -> Expression:
    """Удаляет из строки частые разделители телефонов.

    Решение без REGEXP_REPLACE, чтобы работало и в SQLite-тестах, и в Postgres.
    """

    result: Expression | str = expression
    for needle in (" ", "(", ")", "-", "+", ".", ",", "/"):
        result = Replace(result, Value(needle), Value(""))
    return result
