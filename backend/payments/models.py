from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from branches.models import Branch
from clients.models import Client
from companies.models import Company
from core.models import TimeStampedModel
from memberships.models import Membership
from sales.models import Sale


class Payment(TimeStampedModel):
    """Платёж по продаже или абонементу."""

    class Status(models.TextChoices):
        PENDING = "pending", "В ожидании"
        SUCCEEDED = "succeeded", "Успешно"
        FAILED = "failed", "Ошибка"
        REFUNDED = "refunded", "Возврат"

    class Method(models.TextChoices):
        CASH = "cash", "Наличные"
        CARD = "card", "Карта"
        TRANSFER = "transfer", "Перевод"
        ONLINE = "online", "Онлайн"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
        verbose_name="Филиал",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
        verbose_name="Клиент",
    )
    membership = models.ForeignKey(
        Membership,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
        verbose_name="Абонемент",
    )
    sale = models.ForeignKey(
        Sale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
        verbose_name="Продажа",
    )
    amount = models.DecimalField("Сумма", max_digits=12, decimal_places=2)
    method = models.CharField(
        "Способ оплаты",
        max_length=20,
        choices=Method.choices,
        default=Method.CARD,
    )
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    paid_at = models.DateTimeField("Дата оплаты", null=True, blank=True)
    external_id = models.CharField("Внешний ID", max_length=120, blank=True)
    notes = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "Платёж"
        verbose_name_plural = "Платежи"
        ordering = ["-created_at"]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании, что и платёж."
        if self.client_id and self.client.company_id != self.company_id:
            errors["client"] = "Клиент должен принадлежать той же компании, что и платёж."
        if self.membership_id and self.membership.company_id != self.company_id:
            errors["membership"] = "Абонемент должен принадлежать той же компании, что и платёж."
        if self.sale_id and self.sale.company_id != self.company_id:
            errors["sale"] = "Продажа должна принадлежать той же компании, что и платёж."
        if self.amount <= 0:
            errors["amount"] = "Сумма платежа должна быть больше нуля."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.amount} ₽"
