from __future__ import annotations

from django.db.models import QuerySet
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListAPIView, ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from channels.choices import MessengerProvider
from channels.max_client import register_max_webhook
from channels.models import MessengerIntegration, MessengerMessage, MessengerThread
from channels.serializers import (
    MessengerIntegrationSerializer,
    MessengerIntegrationWriteSerializer,
    MessengerMessageSerializer,
    MessengerMessageWriteSerializer,
    MessengerThreadSerializer,
)
from channels.services import mark_thread_read, send_thread_message
from channels.webhook_urls import build_max_webhook_url
from clients.views import get_company_from_request


class ChannelsQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company(self):
        return get_company_from_request(self.request)

    def get_provider(self) -> str | None:
        return str(self.request.query_params.get("provider") or "").strip() or None


class MessengerIntegrationView(ChannelsQuerysetMixin, APIView):
    def get_integration(self, provider: str) -> MessengerIntegration | None:
        return MessengerIntegration.objects.filter(
            company=self.get_company(),
            provider=provider,
        ).first()

    def get(self, request: Request) -> Response:
        provider = self.get_provider()
        if not provider:
            return Response({"detail": "Укажите provider."}, status=400)
        integration = self.get_integration(provider)
        if not integration:
            return Response([])
        return Response([MessengerIntegrationSerializer(integration).data])

    def patch(self, request: Request) -> Response:
        return self._upsert(request)

    def post(self, request: Request) -> Response:
        return self._upsert(request)

    def _upsert(self, request: Request) -> Response:
        provider = self.get_provider()
        if not provider:
            return Response({"detail": "Укажите provider."}, status=400)
        if provider not in MessengerProvider.values:
            return Response({"detail": "Неизвестный provider."}, status=400)

        company = self.get_company()
        integration, _ = MessengerIntegration.objects.get_or_create(
            company=company,
            provider=provider,
        )
        serializer = MessengerIntegrationWriteSerializer(
            integration,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        integration = serializer.save()

        if provider == MessengerProvider.MAX and integration.bot_token and integration.is_active:
            webhook_url = build_max_webhook_url(integration)
            if webhook_url:
                try:
                    register_max_webhook(
                        integration.bot_token,
                        webhook_url,
                        integration.webhook_secret,
                    )
                except Exception:
                    pass

        read_serializer = MessengerIntegrationSerializer(integration)
        return Response(read_serializer.data)


class MessengerThreadListView(ChannelsQuerysetMixin, ListAPIView):
    serializer_class = MessengerThreadSerializer

    def get_queryset(self) -> QuerySet[MessengerThread]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return MessengerThread.objects.none()

        queryset = MessengerThread.objects.filter(
            company__slug=company_slug,
            company__is_active=True,
        ).select_related("client")
        provider = self.get_provider()
        if provider:
            queryset = queryset.filter(provider=provider)
        return queryset.order_by("-last_message_at", "-id")


class MessengerMessageListCreateView(ChannelsQuerysetMixin, ListCreateAPIView):
    def get_thread(self) -> MessengerThread:
        company_slug = resolve_company_slug(self.request, required=True)
        return MessengerThread.objects.select_related("company", "client").get(
            id=self.kwargs["thread_id"],
            company__slug=company_slug,
            company__is_active=True,
        )

    def get_queryset(self) -> QuerySet[MessengerMessage]:
        return (
            self.get_thread()
            .messages.select_related("author_user")
            .order_by("sent_at", "id")
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MessengerMessageWriteSerializer
        return MessengerMessageSerializer

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = MessengerMessageWriteSerializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        try:
            message = send_thread_message(
                thread=self.get_thread(),
                body=write_serializer.validated_data["body"],
                author_user=request.user,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        read_serializer = MessengerMessageSerializer(message)
        return Response(read_serializer.data, status=201)


class MessengerThreadReadView(ChannelsQuerysetMixin, APIView):
    def post(self, request: Request, thread_id: int) -> Response:
        company_slug = resolve_company_slug(request, required=True)
        thread = MessengerThread.objects.get(
            id=thread_id,
            company__slug=company_slug,
            company__is_active=True,
        )
        mark_thread_read(thread)
        return Response({"status": "ok"})
