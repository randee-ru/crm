from __future__ import annotations

from django.db import models
from django.utils.text import slugify

from companies.models import Company
from core.models import TimeStampedModel


class Branch(TimeStampedModel):
    """Филиал компании.

    В SaaS-модели филиал помогает разделять доступ, расписание и операции
    внутри одной компании.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="branches",
        verbose_name="Компания",
    )
    name = models.CharField("Название", max_length=255)
    slug = models.SlugField("URL-идентификатор", max_length=255)
    is_primary = models.BooleanField("Основной филиал", default=False)
    is_active = models.BooleanField("Активен", default=True)
    city = models.CharField("Город", max_length=120, blank=True)
    address = models.CharField("Адрес", max_length=255, blank=True)

    class Meta:
        verbose_name = "Филиал"
        verbose_name_plural = "Филиалы"
        ordering = ["company", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "slug"],
                name="uniq_branch_slug_per_company",
            )
        ]

    def save(self, *args: object, **kwargs: object) -> None:
        # Slug нужен, чтобы филиал можно было безопасно использовать в ссылках
        # и внешних интеграциях без зависимости от перевода или пробелов.
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.company.name} / {self.name}"

