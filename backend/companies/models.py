from __future__ import annotations

from django.db import models
from django.utils.text import slugify

from core.models import TimeStampedModel


class Company(TimeStampedModel):
    """Компания - это tenant в CRM Kit.

    Все основные данные в SaaS-платформе должны принадлежать компании,
    чтобы мы не смешивали информацию разных клиентов в одной базе.
    """

    name = models.CharField("Название", max_length=255, unique=True)
    slug = models.SlugField("URL-идентификатор", max_length=255, unique=True)
    is_active = models.BooleanField("Активна", default=True)

    class Meta:
        verbose_name = "Компания"
        verbose_name_plural = "Компании"
        ordering = ["name"]

    def save(self, *args: object, **kwargs: object) -> None:
        # Автоматически заполняем slug, чтобы у компании был стабильный
        # человекочитаемый идентификатор даже если его не ввели вручную.
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name

