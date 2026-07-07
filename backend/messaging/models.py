from __future__ import annotations

from django.conf import settings
from django.db import models

from companies.models import Company
from core.models import TimeStampedModel


class ChatRoom(TimeStampedModel):
    """Комната чата компании."""

    class RoomType(models.TextChoices):
        COMPANY_NEWS = "company_news", "Новости компании"
        GENERAL = "general", "Общий чат"
        DIRECT = "direct", "Личный чат"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="chat_rooms",
        verbose_name="Компания",
    )
    room_type = models.CharField("Тип", max_length=20, choices=RoomType.choices, default=RoomType.GENERAL)
    title = models.CharField("Название", max_length=120)
    slug = models.SlugField("Код", max_length=80)
    last_message_at = models.DateTimeField("Последнее сообщение", null=True, blank=True)

    class Meta:
        verbose_name = "Чат"
        verbose_name_plural = "Чаты"
        ordering = ["-last_message_at", "title"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "slug"],
                name="uniq_chat_room_slug_per_company",
            )
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.company})"


class ChatMessage(TimeStampedModel):
    """Сообщение в чате."""

    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Чат",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_messages",
        verbose_name="Автор",
    )
    body = models.TextField("Текст")

    class Meta:
        verbose_name = "Сообщение"
        verbose_name_plural = "Сообщения"
        ordering = ["created_at", "id"]

    def __str__(self) -> str:
        return f"{self.author_id}: {self.body[:40]}"
