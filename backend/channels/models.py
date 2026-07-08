from __future__ import annotations

from django.conf import settings
from django.db import models

from channels.choices import MessageDirection, MessengerProvider
from core.models import TimeStampedModel


class MessengerIntegration(TimeStampedModel):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="messenger_integrations",
        verbose_name="Компания",
    )
    provider = models.CharField(
        "Провайдер",
        max_length=32,
        choices=MessengerProvider.choices,
    )
    bot_token = models.CharField("Токен бота", max_length=512, blank=True)
    webhook_secret = models.CharField("Секрет webhook", max_length=256, blank=True)
    settings = models.JSONField("Настройки", default=dict, blank=True)
    is_active = models.BooleanField("Активна", default=True)
    connection_mode = models.CharField(
        "Режим подключения",
        max_length=16,
        choices=[("bot", "Бот"), ("gateway", "Личный аккаунт")],
        default="gateway",
    )

    class Meta:
        verbose_name = "Интеграция мессенджера"
        verbose_name_plural = "Интеграции мессенджеров"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "provider"],
                name="uniq_messenger_integration_company_provider",
            )
        ]

    def __str__(self) -> str:
        return f"{self.company.slug} · {self.get_provider_display()}"


class MessengerAccount(TimeStampedModel):
    """Личный аккаунт мессенджера через messenger-gateway."""

    class Status(models.TextChoices):
        PENDING = "pending", "Ожидание"
        QR = "qr", "Сканируйте QR"
        CODE_REQUIRED = "code_required", "Нужен код"
        PASSWORD_REQUIRED = "password_required", "Нужен пароль 2FA"
        READY = "ready", "Подключён"
        ERROR = "error", "Ошибка"
        DISCONNECTED = "disconnected", "Отключён"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="messenger_accounts",
        verbose_name="Компания",
    )
    provider = models.CharField(
        "Провайдер",
        max_length=32,
        choices=MessengerProvider.choices,
    )
    gateway_session_id = models.CharField("ID сессии шлюза", max_length=128, unique=True)
    label = models.CharField("Название", max_length=120, blank=True)
    phone = models.CharField("Телефон аккаунта", max_length=32, blank=True)
    status = models.CharField(
        "Статус",
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING,
    )
    error_message = models.TextField("Ошибка", blank=True)
    settings = models.JSONField("Настройки", default=dict, blank=True)
    is_active = models.BooleanField("Активен", default=True)
    connected_at = models.DateTimeField("Подключён", null=True, blank=True)

    class Meta:
        verbose_name = "Аккаунт мессенджера"
        verbose_name_plural = "Аккаунты мессенджеров"
        ordering = ["-connected_at", "-id"]

    def __str__(self) -> str:
        return f"{self.label or self.get_provider_display()} ({self.phone or self.gateway_session_id})"


class MessengerThread(TimeStampedModel):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="messenger_threads",
        verbose_name="Компания",
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        related_name="messenger_threads",
        null=True,
        blank=True,
        verbose_name="Клиент",
    )
    provider = models.CharField(
        "Провайдер",
        max_length=32,
        choices=MessengerProvider.choices,
    )
    external_chat_id = models.CharField("ID чата", max_length=128, db_index=True)
    external_user_id = models.CharField("ID пользователя", max_length=128, blank=True)
    chat_type = models.CharField("Тип чата", max_length=32, blank=True)
    contact_name = models.CharField("Имя контакта", max_length=255, blank=True)
    contact_phone = models.CharField("Телефон контакта", max_length=32, blank=True)
    account = models.ForeignKey(
        "channels.MessengerAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="threads",
        verbose_name="Аккаунт",
    )
    last_message_at = models.DateTimeField("Последнее сообщение", null=True, blank=True)
    last_message_preview = models.CharField("Превью", max_length=255, blank=True)
    unread_count = models.PositiveIntegerField("Непрочитанные", default=0)

    class Meta:
        verbose_name = "Диалог мессенджера"
        verbose_name_plural = "Диалоги мессенджеров"
        ordering = ["-last_message_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "provider", "external_chat_id"],
                name="uniq_messenger_thread_external_chat",
            )
        ]

    def __str__(self) -> str:
        return self.contact_name or self.contact_phone or self.external_chat_id


class MessengerMessage(TimeStampedModel):
    thread = models.ForeignKey(
        MessengerThread,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Диалог",
    )
    direction = models.CharField(
        "Направление",
        max_length=16,
        choices=MessageDirection.choices,
    )
    external_id = models.CharField("Внешний ID", max_length=128, blank=True, db_index=True)
    body = models.TextField("Текст", blank=True)
    sent_at = models.DateTimeField("Дата отправки", null=True, blank=True)
    author_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="messenger_messages",
        null=True,
        blank=True,
        verbose_name="Автор",
    )
    raw_payload = models.JSONField("Сырой payload", default=dict, blank=True)

    class Meta:
        verbose_name = "Сообщение мессенджера"
        verbose_name_plural = "Сообщения мессенджеров"
        ordering = ["sent_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["thread", "external_id"],
                condition=models.Q(external_id__gt=""),
                name="uniq_messenger_message_external_id",
            )
        ]

    def __str__(self) -> str:
        return f"{self.direction}: {self.body[:40]}"
