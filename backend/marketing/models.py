from __future__ import annotations

from django.conf import settings
from django.db import models

from companies.models import Company
from core.models import TimeStampedModel


class MarketingIntegration(TimeStampedModel):
    """Подключённый маркетинговый сервис (реклама, рассылки, автоматизация)."""

    class Provider(models.TextChoices):
        EMAIL = "email", "Email рассылка"
        SMS = "sms", "SMS рассылка"
        MESSENGERS = "messengers", "Мессенджеры"
        LOOKALIKE = "lookalike", "Look-alike аудитория"
        GOOGLE_ADS = "google_ads", "Google Ads"
        VK_ADS = "vk_ads", "VK Реклама"
        YANDEX_DIRECT = "yandex_direct", "Яндекс.Директ"
        YANDEX_TOLOKA = "yandex_toloka", "Яндекс.Толока"
        REPEAT_DEALS = "repeat_deals", "Повторные сделки"

    class Status(models.TextChoices):
        DISCONNECTED = "disconnected", "Не подключено"
        CONNECTED = "connected", "Подключено"
        PENDING = "pending", "Ожидает проверки"
        ERROR = "error", "Ошибка"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="marketing_integrations",
        verbose_name="Компания",
    )
    connected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="marketing_integrations",
        verbose_name="Подключил",
    )
    provider = models.CharField("Сервис", max_length=30, choices=Provider.choices)
    title = models.CharField("Название", max_length=120, blank=True)
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.DISCONNECTED,
    )
    settings = models.JSONField("Настройки", default=dict, blank=True)
    is_active = models.BooleanField("Активен", default=True)
    last_synced_at = models.DateTimeField("Последняя синхронизация", null=True, blank=True)

    class Meta:
        verbose_name = "Маркетинговая интеграция"
        verbose_name_plural = "Маркетинговые интеграции"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "provider"],
                name="uniq_marketing_integration_per_company",
            )
        ]

    def __str__(self) -> str:
        return self.title or self.get_provider_display()


class MarketingCampaign(TimeStampedModel):
    """Маркетинговая рассылка или кампания."""

    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        SMS = "sms", "SMS"
        MESSENGERS = "messengers", "Мессенджеры"

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        SCHEDULED = "scheduled", "Запланирована"
        SENT = "sent", "Отправлена"
        CANCELLED = "cancelled", "Отменена"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="marketing_campaigns",
        verbose_name="Компания",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="marketing_campaigns",
        verbose_name="Автор",
    )
    channel = models.CharField("Канал", max_length=20, choices=Channel.choices)
    title = models.CharField("Название", max_length=255)
    subject = models.CharField("Тема", max_length=255, blank=True)
    body = models.TextField("Текст", blank=True)
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    recipients_count = models.PositiveIntegerField("Получателей", default=0)
    scheduled_at = models.DateTimeField("Запланирована на", null=True, blank=True)
    sent_at = models.DateTimeField("Отправлена", null=True, blank=True)

    class Meta:
        verbose_name = "Маркетинговая кампания"
        verbose_name_plural = "Маркетинговые кампании"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
