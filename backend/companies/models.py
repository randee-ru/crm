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
    disabled_modules = models.JSONField(
        "Скрытые модули меню",
        default=list,
        blank=True,
        help_text="Идентификаторы пунктов бокового меню, скрытых для всех сотрудников компании.",
    )
    role_disabled_modules = models.JSONField(
        "Скрытые модули меню по ролям",
        default=dict,
        blank=True,
        help_text="Словарь {роль: [id пунктов меню]} — что дополнительно скрыто для конкретной роли.",
    )

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

    def effective_disabled_modules(self, role: str) -> list[str]:
        """Модули меню, скрытые для конкретной роли: общие + ролевые.

        Владелец (owner) всегда видит полное меню — это защита от случайной
        самоблокировки.
        """
        if role == "owner":
            return list(self.disabled_modules)
        merged = set(self.disabled_modules) | set(self.role_disabled_modules.get(role, []))
        return sorted(merged)

    def __str__(self) -> str:
        return self.name

