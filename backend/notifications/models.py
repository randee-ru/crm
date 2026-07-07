from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from companies.models import Company
from core.models import TimeStampedModel


class Notification(TimeStampedModel):
    """Уведомление для пользователя или компании."""

    class Kind(models.TextChoices):
        INFO = "info", "Информация"
        SUCCESS = "success", "Успех"
        WARNING = "warning", "Предупреждение"
        ERROR = "error", "Ошибка"
        TASK = "task", "Задача"
        CRM = "crm", "CRM"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="Компания",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
        verbose_name="Получатель",
    )
    kind = models.CharField("Тип", max_length=20, choices=Kind.choices, default=Kind.INFO)
    title = models.CharField("Заголовок", max_length=255)
    body = models.TextField("Текст", blank=True)
    target_url = models.CharField("Ссылка", max_length=255, blank=True)
    is_read = models.BooleanField("Прочитано", default=False)
    read_at = models.DateTimeField("Прочитано в", null=True, blank=True)
    source_app = models.CharField("Источник", max_length=120, blank=True)
    source_model = models.CharField("Модель источника", max_length=120, blank=True)
    source_object_id = models.CharField("ID источника", max_length=64, blank=True)
    payload = models.JSONField("Данные", default=dict, blank=True)

    class Meta:
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"
        ordering = ["-created_at", "-id"]

    def mark_read(self) -> None:
        if self.is_read:
            return
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=["is_read", "read_at", "updated_at"])

    def __str__(self) -> str:
        return self.title
