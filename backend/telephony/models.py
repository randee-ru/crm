from __future__ import annotations

from django.conf import settings
from django.db import models

from clients.models import Client
from companies.models import Company
from core.models import TimeStampedModel


class TelephonyIntegration(TimeStampedModel):
    """Настройки телефонии компании (Mango Office и др.)."""

    class Provider(models.TextChoices):
        NONE = "none", "Не подключено"
        MANGO = "mango", "Mango Office"
        BINOTEL = "binotel", "Binotel"
        ZADARMA = "zadarma", "Zadarma"
        WEBHOOK = "webhook", "Webhook"

    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name="telephony_integration",
        verbose_name="Компания",
    )
    provider = models.CharField(
        "Провайдер",
        max_length=20,
        choices=Provider.choices,
        default=Provider.NONE,
    )
    api_url = models.URLField("API URL", blank=True, default="https://app.mango-office.ru/vpbx")
    api_key = models.CharField("API Key", max_length=255, blank=True)
    api_secret = models.CharField("API Salt", max_length=255, blank=True)
    webhook_secret = models.CharField("Webhook secret", max_length=64, blank=True)
    settings = models.JSONField("Доп. настройки", default=dict, blank=True)
    is_active = models.BooleanField("Активна", default=True)
    last_synced_at = models.DateTimeField("Последняя синхронизация", null=True, blank=True)

    class Meta:
        verbose_name = "Интеграция телефонии"
        verbose_name_plural = "Интеграции телефонии"

    def __str__(self) -> str:
        return f"{self.company.slug} ({self.get_provider_display()})"


class CallLog(TimeStampedModel):
    """Журнал звонков с привязкой к клиенту."""

    class Direction(models.TextChoices):
        INCOMING = "incoming", "Входящий"
        OUTGOING = "outgoing", "Исходящий"

    class Status(models.TextChoices):
        ANSWERED = "answered", "Отвечен"
        MISSED = "missed", "Пропущен"
        BUSY = "busy", "Занято"
        VOICEMAIL = "voicemail", "Голосовая почта"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="call_logs",
        verbose_name="Компания",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="call_logs",
        verbose_name="Клиент",
    )
    external_id = models.CharField("Внешний ID", max_length=128, blank=True, db_index=True)
    direction = models.CharField(
        "Направление",
        max_length=20,
        choices=Direction.choices,
        default=Direction.INCOMING,
    )
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.ANSWERED,
    )
    caller_phone = models.CharField("Номер звонящего", max_length=32, blank=True)
    target_phone = models.CharField("Номер назначения", max_length=32, blank=True)
    from_number = models.CharField("From (сырой)", max_length=64, blank=True)
    to_number = models.CharField("To (сырой)", max_length=64, blank=True)
    line_number = models.CharField("Линия (номер)", max_length=64, blank=True)
    line_name = models.CharField("Линия", max_length=120, blank=True)
    recording_id = models.CharField("ID записи", max_length=128, blank=True, db_index=True)
    recording_url = models.TextField("Ссылка на запись", blank=True)
    recording_file = models.FileField(
        "Локальная запись",
        upload_to="telephony/recordings/%Y/%m/",
        blank=True,
        null=True,
    )
    recording_archived_at = models.DateTimeField("Запись сохранена локально", null=True, blank=True)
    started_at = models.DateTimeField("Начало")
    duration = models.PositiveIntegerField("Длительность (сек)", default=0)
    source = models.CharField("Источник", max_length=120, blank=True)
    transcription_text = models.TextField("Транскрипция", blank=True)
    call_summary = models.CharField("Краткое резюме", max_length=500, blank=True)
    call_report = models.TextField("AI-отчёт", blank=True)

    class Meta:
        verbose_name = "Звонок"
        verbose_name_plural = "Звонки"
        ordering = ["-started_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "external_id"],
                condition=models.Q(external_id__gt=""),
                name="uniq_call_external_id_per_company",
            )
        ]

    def __str__(self) -> str:
        return f"{self.caller_phone} → {self.line_name or self.target_phone} ({self.started_at:%d.%m.%Y %H:%M})"
