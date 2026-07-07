from __future__ import annotations

from django.db.models import QuerySet
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.permissions import HasCompanyAccess, resolve_company_slug
from clients.views import get_company_from_request
from mailbox.models import MailAccount, MailMessage
from mailbox.serializers import (
    MailAccountSerializer,
    MailAccountWriteSerializer,
    MailMessageSerializer,
    MailMessageWriteSerializer,
)


class MailboxQuerysetMixin:
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    def get_company(self):
        return get_company_from_request(self.request)

    def get_accounts_queryset(self) -> QuerySet[MailAccount]:
        company_slug = resolve_company_slug(self.request, required=True)
        if not company_slug:
            return MailAccount.objects.none()
        return MailAccount.objects.filter(
            company__slug=company_slug,
            company__is_active=True,
            user=self.request.user,
            is_active=True,
        )


class MailAccountListCreateView(MailboxQuerysetMixin, ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return MailAccountWriteSerializer
        return MailAccountSerializer

    def get_queryset(self) -> QuerySet[MailAccount]:
        return self.get_accounts_queryset().order_by("-created_at")

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["company"] = self.get_company()
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = MailAccountWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        account = write_serializer.save()
        self._seed_welcome_messages(account)
        read_serializer = MailAccountSerializer(account, context=self.get_serializer_context())
        return Response(read_serializer.data, status=201)

    def _seed_welcome_messages(self, account: MailAccount) -> None:
        from django.utils import timezone

        if account.messages.exists():
            return

        welcome_messages = [
            (
                "Добро пожаловать в CRM Kit",
                "Почта подключена. Здесь будут письма клиентов, уведомления клуба и переписка команды.",
            ),
            (
                "Расписание групповых занятий",
                "Напоминаем: завтра обновление расписания йоги и функциональных тренировок.",
            ),
            (
                "Новый лид с сайта",
                "Поступила заявка на пробное занятие. Ответьте клиенту в течение 15 минут.",
            ),
        ]

        for subject, body in welcome_messages:
            MailMessage.objects.create(
                account=account,
                folder=MailMessage.Folder.INBOX,
                subject=subject,
                body=body,
                from_name="CRM Kit",
                from_email="noreply@sportmax.local",
                to_emails=account.email,
                is_read=False,
                sent_at=timezone.now(),
            )


class MailMessageListCreateView(MailboxQuerysetMixin, ListCreateAPIView):
    def get_account(self) -> MailAccount:
        account_id = self.kwargs["account_id"]
        return self.get_accounts_queryset().get(id=account_id)

    def get_queryset(self) -> QuerySet[MailMessage]:
        queryset = self.get_account().messages.all()
        folder = self.request.query_params.get("folder", MailMessage.Folder.INBOX).strip()
        if folder:
            queryset = queryset.filter(folder=folder)
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(subject__icontains=search)
        return queryset.order_by("-sent_at", "-id")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MailMessageWriteSerializer
        return MailMessageSerializer

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["account"] = self.get_account()
        return context

    def create(self, request: Request, *args, **kwargs) -> Response:
        write_serializer = MailMessageWriteSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        write_serializer.is_valid(raise_exception=True)
        message = write_serializer.save()
        read_serializer = MailMessageSerializer(message)
        return Response(read_serializer.data, status=201)


class MailMessageDetailView(MailboxQuerysetMixin, RetrieveUpdateAPIView):
    lookup_url_kwarg = "message_id"
    serializer_class = MailMessageSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self) -> QuerySet[MailMessage]:
        account_id = self.kwargs["account_id"]
        return MailMessage.objects.filter(account_id=account_id, account__user=self.request.user)

    def patch(self, request: Request, *args, **kwargs) -> Response:
        message = self.get_object()
        if "is_read" in request.data:
            message.is_read = bool(request.data["is_read"])
            message.save(update_fields=["is_read", "updated_at"])
        serializer = self.get_serializer(message)
        return Response(serializer.data)
