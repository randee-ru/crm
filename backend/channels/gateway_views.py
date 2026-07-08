from __future__ import annotations

import json
import logging

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from channels.gateway_services import (
    create_gateway_account,
    disconnect_gateway_account,
    process_gateway_inbound,
    refresh_gateway_account,
    submit_gateway_max_code,
    submit_gateway_max_password,
    submit_gateway_telegram_code,
    submit_gateway_telegram_password,
    verify_gateway_signature,
)
from channels.models import MessengerAccount
from channels.serializers import (
    MessengerAccountSerializer,
    MessengerAccountWriteSerializer,
    MessengerGatewayCodeSerializer,
    MessengerGatewayPasswordSerializer,
    MessengerTelegramCodeSerializer,
    MessengerTelegramPasswordSerializer,
)
from clients.views import get_company_from_request
from companies.models import Company
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated

logger = logging.getLogger(__name__)


class GatewayAccountQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company(self) -> Company:
        return get_company_from_request(self.request)

    def get_account(self, account_id: int) -> MessengerAccount:
        company_slug = resolve_company_slug(self.request, required=True)
        return MessengerAccount.objects.get(
            id=account_id,
            company__slug=company_slug,
            company__is_active=True,
            is_active=True,
        )


class MessengerGatewayAccountListCreateView(GatewayAccountQuerysetMixin, ListCreateAPIView):
    serializer_class = MessengerAccountSerializer

    def get_queryset(self):
        company = self.get_company()
        queryset = MessengerAccount.objects.filter(company=company, is_active=True)
        provider = str(self.request.query_params.get("provider") or "").strip()
        if provider:
            queryset = queryset.filter(provider=provider)
        return queryset.order_by("-connected_at", "-id")

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = MessengerAccountWriteSerializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        try:
            account = create_gateway_account(
                company=self.get_company(),
                provider=write_serializer.validated_data["provider"],
                label=write_serializer.validated_data.get("label", ""),
                phone=write_serializer.validated_data.get("phone", ""),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        read_serializer = MessengerAccountSerializer(account)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class MessengerGatewayAccountDetailView(GatewayAccountQuerysetMixin, APIView):
    def get(self, request: Request, account_id: int) -> Response:
        account = self.get_account(account_id)
        account = refresh_gateway_account(account)
        return Response(MessengerAccountSerializer(account).data)

    def delete(self, request: Request, account_id: int) -> Response:
        account = self.get_account(account_id)
        disconnect_gateway_account(account)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessengerGatewayTelegramCodeView(GatewayAccountQuerysetMixin, APIView):
    def post(self, request: Request, account_id: int) -> Response:
        account = self.get_account(account_id)
        serializer = MessengerTelegramCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = submit_gateway_telegram_code(account, serializer.validated_data["code"])
        return Response(MessengerAccountSerializer(account).data)


class MessengerGatewayTelegramPasswordView(GatewayAccountQuerysetMixin, APIView):
    def post(self, request: Request, account_id: int) -> Response:
        account = self.get_account(account_id)
        serializer = MessengerTelegramPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = submit_gateway_telegram_password(account, serializer.validated_data["password"])
        return Response(MessengerAccountSerializer(account).data)


class MessengerGatewayMaxCodeView(GatewayAccountQuerysetMixin, APIView):
    def post(self, request: Request, account_id: int) -> Response:
        account = self.get_account(account_id)
        serializer = MessengerGatewayCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = submit_gateway_max_code(account, serializer.validated_data["code"])
        return Response(MessengerAccountSerializer(account).data)


class MessengerGatewayMaxPasswordView(GatewayAccountQuerysetMixin, APIView):
    def post(self, request: Request, account_id: int) -> Response:
        account = self.get_account(account_id)
        serializer = MessengerGatewayPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = submit_gateway_max_password(account, serializer.validated_data["password"])
        return Response(MessengerAccountSerializer(account).data)


class MessengerGatewayInboundView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        raw_body = request.body
        signature = str(request.headers.get("X-Gateway-Secret") or "").strip()
        if not verify_gateway_signature(raw_body, signature):
            return Response({"status": "error", "reason": "invalid_secret"}, status=403)

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return Response({"status": "error", "reason": "invalid_payload"}, status=400)

        company_slug = str(payload.get("company_slug") or "").strip()
        if not company_slug:
            return Response({"status": "error", "reason": "company_slug_required"}, status=400)

        company = Company.objects.filter(slug=company_slug, is_active=True).first()
        if not company:
            return Response({"status": "error", "reason": "company_not_found"}, status=404)

        try:
            result = process_gateway_inbound(company, payload)
        except Exception:
            logger.exception("Gateway inbound processing failed")
            return Response({"status": "error", "reason": "processing_failed"}, status=500)

        return Response(result)

    def get(self, request: Request) -> Response:
        return Response({"status": "ok", "service": "gateway-inbound"})
