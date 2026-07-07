from __future__ import annotations

from django.conf import settings
from django.db import models

from companies.models import Company
from core.models import TimeStampedModel


class AutomationRule(TimeStampedModel):
    """Правило автоматизации, реагирующее на бизнес-событие."""

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="automation_rules",
        verbose_name="Компания",
    )
    name = models.CharField("Название", max_length=255)
    event_type = models.CharField("Тип события", max_length=120, db_index=True)
    is_active = models.BooleanField("Активно", default=True)
    sort_order = models.PositiveIntegerField("Порядок", default=0)
    conditions = models.JSONField("Условия", default=dict, blank=True)
    actions = models.JSONField("Действия", default=list, blank=True)
    last_run_at = models.DateTimeField("Последний запуск", null=True, blank=True)
    last_error = models.TextField("Последняя ошибка", blank=True)

    class Meta:
        verbose_name = "Правило автоматизации"
        verbose_name_plural = "Правила автоматизации"
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class AutomationEvent(TimeStampedModel):
    """Событие, попавшее в очередь автоматизации."""

    class Status(models.TextChoices):
        PENDING = "pending", "В очереди"
        PROCESSING = "processing", "В обработке"
        DONE = "done", "Выполнено"
        FAILED = "failed", "Ошибка"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="automation_events",
        verbose_name="Компания",
    )
    event_type = models.CharField("Тип события", max_length=120, db_index=True)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.PENDING)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="automation_events",
        verbose_name="Автор",
    )
    source_app = models.CharField("Источник", max_length=120, blank=True)
    source_model = models.CharField("Модель источника", max_length=120, blank=True)
    source_object_id = models.CharField("ID источника", max_length=64, blank=True)
    payload = models.JSONField("Данные", default=dict, blank=True)
    processed_at = models.DateTimeField("Обработано в", null=True, blank=True)
    error = models.TextField("Ошибка", blank=True)

    class Meta:
        verbose_name = "Событие автоматизации"
        verbose_name_plural = "События автоматизации"
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.event_type} ({self.status})"
