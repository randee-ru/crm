from __future__ import annotations

import secrets

from schedule.models import ScheduleSettings


def get_schedule_settings(company) -> ScheduleSettings:
    settings, _ = ScheduleSettings.objects.get_or_create(company=company)
    return settings


def ensure_embed_token(settings: ScheduleSettings) -> str:
    if not settings.embed_token:
        settings.embed_token = secrets.token_urlsafe(24)
        settings.save(update_fields=["embed_token", "updated_at"])
    return settings.embed_token
