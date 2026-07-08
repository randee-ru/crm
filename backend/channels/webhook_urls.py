from __future__ import annotations

import os

from channels.models import MessengerIntegration


def get_public_app_url(integration: MessengerIntegration | None = None) -> str:
    url = (os.getenv("PUBLIC_APP_URL") or os.getenv("MESSENGER_WEBHOOK_BASE_URL") or "").strip()
    if not url and integration and isinstance(integration.settings, dict):
        url = str(integration.settings.get("public_app_url") or "").strip()
    return url.rstrip("/")


def build_max_webhook_url(integration: MessengerIntegration | None = None) -> str:
    base = get_public_app_url(integration)
    if not base:
        return ""
    company_slug = ""
    if integration and integration.company_id:
        company_slug = integration.company.slug
    url = f"{base}/api/channels/webhooks/max"
    if company_slug:
        return f"{url}?company={company_slug}"
    return url
