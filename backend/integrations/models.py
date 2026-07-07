from __future__ import annotations

from django.db import models

from companies.models import Company
from core.models import TimeStampedModel


class IntegrationConnection(TimeStampedModel):
    """Внешняя интеграция компании."""

    class Provider(models.TextChoices):
        MANGO = "mango", "Mango Office"
        SIGUR = "sigur", "Sigur"
        RFID = "rfid", "RFID"
        TURNSTILE = "turnstile", "Турникеты"
        PAYMENT = "payment", "Платёжный сервис"
        SMS = "sms", "SMS"
        PARTNER = "partner", "Партнёрский адаптер"

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        ACTIVE = "active", "Активна"
        ERROR = "error", "Ошибка"
        ARCHIVED = "archived", "Архив"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="integration_connections",
        verbose_name="Компания",
    )
    provider = models.CharField("Провайдер", max_length=40, choices=Provider.choices)
    name = models.CharField("Название", max_length=255)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.DRAFT)
    external_id = models.CharField("Внешний ID", max_length=120, blank=True)
    config = models.JSONField("Настройки", default=dict, blank=True)
    last_synced_at = models.DateTimeField("Последняя синхронизация", null=True, blank=True)
    last_error = models.TextField("Последняя ошибка", blank=True)

    class Meta:
        verbose_name = "Интеграция"
        verbose_name_plural = "Интеграции"
        ordering = ["provider", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "provider", "external_id"],
                condition=models.Q(external_id__gt=""),
                name="uniq_integration_external_id_per_company",
            )
        ]

    def __str__(self) -> str:
        return f"{self.get_provider_display()} — {self.name}"


class IntegrationEvent(TimeStampedModel):
    """Лог внешнего события или вебхука."""

    class Direction(models.TextChoices):
        INBOUND = "inbound", "Входящее"
        OUTBOUND = "outbound", "Исходящее"

    class Status(models.TextChoices):
        RECEIVED = "received", "Получено"
        PROCESSED = "processed", "Обработано"
        FAILED = "failed", "Ошибка"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="integration_events",
        verbose_name="Компания",
    )
    connection = models.ForeignKey(
        IntegrationConnection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
        verbose_name="Интеграция",
    )
    provider = models.CharField("Провайдер", max_length=40, choices=IntegrationConnection.Provider.choices)
    direction = models.CharField("Направление", max_length=20, choices=Direction.choices, default=Direction.INBOUND)
    event_type = models.CharField("Тип события", max_length=120)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.RECEIVED)
    payload = models.JSONField("Данные", default=dict, blank=True)
    external_key = models.CharField("Внешний ключ", max_length=128, blank=True)
    received_at = models.DateTimeField("Получено в", null=True, blank=True)
    processed_at = models.DateTimeField("Обработано в", null=True, blank=True)
    error = models.TextField("Ошибка", blank=True)

    class Meta:
        verbose_name = "Событие интеграции"
        verbose_name_plural = "События интеграций"
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.provider} / {self.event_type}"
