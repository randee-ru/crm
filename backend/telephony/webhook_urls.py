from __future__ import annotations

import os

from telephony.models import TelephonyIntegration


def get_public_app_url(integration: TelephonyIntegration | None = None) -> str:
    url = (os.getenv("PUBLIC_APP_URL") or os.getenv("MANGO_WEBHOOK_BASE_URL") or "").strip()
    if not url and integration and isinstance(integration.settings, dict):
        url = str(integration.settings.get("public_app_url") or "").strip()
    return url.rstrip("/")


def build_mango_webhook_url(integration: TelephonyIntegration | None = None) -> str:
    base = get_public_app_url(integration)
    if not base:
        return ""
    return f"{base}/api/mango/callback"
