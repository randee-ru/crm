from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from django.utils import timezone

from companies.models import Company
from notifications.models import Notification

User = get_user_model()


def create_notification(
    *,
    company: Company,
    title: str,
    body: str = "",
    kind: str = Notification.Kind.INFO,
    target_url: str = "",
    recipient: User | None = None,
    source_app: str = "",
    source_model: str = "",
    source_object_id: str = "",
    payload: dict[str, Any] | None = None,
) -> Notification:
    return Notification.objects.create(
        company=company,
        recipient=recipient,
        kind=kind,
        title=title,
        body=body,
        target_url=target_url,
        source_app=source_app,
        source_model=source_model,
        source_object_id=source_object_id,
        payload=payload or {},
    )


def mark_notifications_read(notifications) -> int:
    updated = 0
    for notification in notifications:
        if notification.is_read:
            continue
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=["is_read", "read_at", "updated_at"])
        updated += 1
    return updated
