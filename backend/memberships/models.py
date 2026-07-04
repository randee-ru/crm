from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from branches.models import Branch
from clients.models import Client
from companies.models import Company
from core.models import TimeStampedModel


class Membership(TimeStampedModel):
    """Абонемент клиента фитнес-клуба.

    На этом этапе мы храним сам факт абонемента, его период действия,
    лимит посещений и текущий статус.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        ACTIVE = "active", "Активен"
        FROZEN = "frozen", "Заморожен"
        EXPIRED = "expired", "Истёк"
        CANCELLED = "cancelled", "Отменён"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="memberships",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="membership_records",
        verbose_name="Филиал",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="memberships",
        verbose_name="Клиент",
    )
    title = models.CharField("Название абонемента", max_length=255)
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    starts_at = models.DateField("Дата начала")
    ends_at = models.DateField("Дата окончания")
    visit_limit = models.PositiveIntegerField(
        "Лимит посещений",
        null=True,
        blank=True,
        help_text="Пустое значение означает безлимитный абонемент.",
    )
    visits_used = models.PositiveIntegerField("Использовано посещений", default=0)
    price = models.DecimalField("Цена", max_digits=10, decimal_places=2, default=0)
    notes = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "Абонемент"
        verbose_name_plural = "Абонементы"
        ordering = ["-starts_at", "client"]

    def clean(self) -> None:
        # Проверяем, что все связи остаются внутри одной компании,
        # иначе SaaS-границы будут нарушены.
        errors: dict[str, str] = {}
        if self.client_id and self.client.company_id != self.company_id:
            errors["client"] = "Клиент должен принадлежать той же компании, что и абонемент."
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании, что и абонемент."
        if self.ends_at and self.starts_at and self.ends_at < self.starts_at:
            errors["ends_at"] = "Дата окончания не может быть раньше даты начала."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def remaining_visits(self) -> int | None:
        # Для безлимитных абонементов возвращаем None,
        # чтобы интерфейс и отчёты могли показать "без лимита".
        if self.visit_limit is None:
            return None
        return max(self.visit_limit - self.visits_used, 0)

    def __str__(self) -> str:
        return f"{self.client.full_name} — {self.title}"

