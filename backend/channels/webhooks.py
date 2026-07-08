from __future__ import annotations

import hmac
import logging

from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import resolve_company_slug
from channels.max_client import parse_max_update
from channels.models import MessengerIntegration
from channels.services import process_max_inbound
from companies.models import Company

logger = logging.getLogger(__name__)


def _resolve_company_for_webhook(request: Request, provider: str) -> Company | None:
    company_slug = resolve_company_slug(request, required=False)
    if company_slug:
        return Company.objects.filter(slug=company_slug, is_active=True).first()

    integration = MessengerIntegration.objects.filter(
        provider=provider,
        is_active=True,
    ).select_related("company").first()
    if integration:
        return integration.company
    return None


def _verify_max_secret(request: Request, integration: MessengerIntegration | None) -> bool:
    if not integration or not integration.webhook_secret:
        return True
    received = str(request.headers.get("X-Max-Bot-Api-Secret") or "").strip()
    if not received:
        return False
    return hmac.compare_digest(received, integration.webhook_secret)


class MaxWebhookView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        company = _resolve_company_for_webhook(request, "max")
        if not company:
            return Response({"status": "error", "reason": "company_not_found"}, status=404)

        integration = MessengerIntegration.objects.filter(
            company=company,
            provider="max",
            is_active=True,
        ).first()
        if integration and not _verify_max_secret(request, integration):
            return Response({"status": "error", "reason": "invalid_secret"}, status=403)

        payload = request.data if isinstance(request.data, dict) else {}
        parsed = parse_max_update(payload)
        if not parsed:
            return Response({"status": "ignored", "reason": "invalid_payload"}, status=400)

        try:
            result = process_max_inbound(company, parsed)
        except Exception:
            logger.exception("MAX webhook processing failed")
            return Response({"status": "error", "reason": "processing_failed"}, status=500)

        return Response(result)

    def get(self, request: Request) -> Response:
        return Response({"status": "ok", "service": "max-webhook"})


class TelegramWebhookView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        return Response({"status": "ok", "service": "telegram-webhook", "note": "stub"})

    def get(self, request: Request) -> Response:
        return Response({"status": "ok", "service": "telegram-webhook"})


class WhatsAppWebhookView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        return Response({"status": "ok", "service": "whatsapp-webhook", "note": "stub"})

    def get(self, request: Request) -> Response:
        return Response({"status": "ok", "service": "whatsapp-webhook"})
