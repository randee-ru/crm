from __future__ import annotations

from django.conf import settings
from django.db import models

from companies.models import Company
from core.models import TimeStampedModel


class DriveItem(TimeStampedModel):
    """Файл или папка на диске компании."""

    class ItemType(models.TextChoices):
        FOLDER = "folder", "Папка"
        FILE = "file", "Файл"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="drive_items",
        verbose_name="Компания",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
        verbose_name="Папка",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="drive_items",
        verbose_name="Автор",
    )
    name = models.CharField("Название", max_length=255)
    item_type = models.CharField("Тип", max_length=10, choices=ItemType.choices)
    file = models.FileField("Файл", upload_to="drive/%Y/%m/", blank=True, null=True)
    mime_type = models.CharField("MIME", max_length=120, blank=True)
    size_bytes = models.PositiveBigIntegerField("Размер", default=0)
    is_trashed = models.BooleanField("В корзине", default=False)

    class Meta:
        verbose_name = "Элемент диска"
        verbose_name_plural = "Элементы диска"
        ordering = ["item_type", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "parent", "name", "is_trashed"],
                name="uniq_drive_item_name_per_folder",
            )
        ]

    def __str__(self) -> str:
        return self.name
