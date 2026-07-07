from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from branches.models import Branch
from clients.models import Client
from companies.models import Company
from core.models import TimeStampedModel
from employees.models import Trainer
from memberships.models import Membership


class Sale(TimeStampedModel):
    """Продажа в фитнес-клубе."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        COMPLETED = "completed", "Завершена"
        CANCELLED = "cancelled", "Отменена"
        REFUNDED = "refunded", "Возврат"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="sales",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
        verbose_name="Филиал",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
        verbose_name="Клиент",
    )
    membership = models.ForeignKey(
        Membership,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
        verbose_name="Абонемент",
    )
    trainer = models.ForeignKey(
        Trainer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
        verbose_name="Тренер",
    )
    title = models.CharField("Название", max_length=255)
    external_number = models.CharField("Номер в 1С", max_length=64, blank=True, db_index=True)
    promo_code = models.CharField("Промокод", max_length=64, blank=True)
    installment_info = models.CharField("Рассрочка", max_length=255, blank=True)
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    total_amount = models.DecimalField("Сумма", max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField("Скидка", max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField("Оплачено", max_digits=12, decimal_places=2, default=0)
    sold_at = models.DateTimeField("Дата продажи", null=True, blank=True)
    notes = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "Продажа"
        verbose_name_plural = "Продажи"
        ordering = ["-created_at"]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании, что и продажа."
        if self.client_id and self.client.company_id != self.company_id:
            errors["client"] = "Клиент должен принадлежать той же компании, что и продажа."
        if self.membership_id and self.membership.company_id != self.company_id:
            errors["membership"] = "Абонемент должен принадлежать той же компании, что и продажа."
        if self.trainer_id and self.trainer.company_id != self.company_id:
            errors["trainer"] = "Тренер должен принадлежать той же компании, что и продажа."
        if self.discount_amount < 0:
            errors["discount_amount"] = "Скидка не может быть отрицательной."
        if self.total_amount < 0:
            errors["total_amount"] = "Сумма не может быть отрицательной."
        if self.paid_amount < 0:
            errors["paid_amount"] = "Оплата не может быть отрицательной."
        if self.discount_amount > self.total_amount:
            errors["discount_amount"] = "Скидка не может быть больше суммы."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def net_amount(self):
        return max(self.total_amount - self.discount_amount, 0)

    @property
    def balance_due(self):
        return max(self.net_amount - self.paid_amount, 0)

    def __str__(self) -> str:
        return self.title
