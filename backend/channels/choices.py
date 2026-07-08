from __future__ import annotations

from django.db import models


class MessengerProvider(models.TextChoices):
    MAX = "max", "МАКС"
    TELEGRAM = "telegram", "Телеграм"
    WHATSAPP = "whatsapp", "Вотсапп"


class MessageDirection(models.TextChoices):
    INBOUND = "inbound", "Входящее"
    OUTBOUND = "outbound", "Исходящее"
