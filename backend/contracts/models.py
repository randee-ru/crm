from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from branches.models import Branch
from clients.models import Client
from companies.models import Company
from core.models import TimeStampedModel
from memberships.models import Membership


class Contract(TimeStampedModel):
    """Договор с клиентом фитнес-клуба."""

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="contracts",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contracts",
        verbose_name="Структурная единица",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="contracts",
        verbose_name="Клиент",
    )
    membership = models.ForeignKey(
        Membership,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contracts",
        verbose_name="Абонемент",
    )
    number = models.CharField("Номер", max_length=32)
    prefix = models.CharField("Префикс", max_length=20, blank=True)
    contract_date = models.DateField("Дата")
    template_name = models.CharField("Бланк договора", max_length=255)
    membership_label = models.CharField("Членство, пакет услуг", max_length=255, blank=True)
    is_signed = models.BooleanField("Подписан", default=False)

    class Meta:
        verbose_name = "Договор"
        verbose_name_plural = "Договоры"
        ordering = ["-contract_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "number"],
                name="uniq_contract_number_per_company",
            )
        ]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.client_id and self.client.company_id != self.company_id:
            errors["client"] = "Клиент должен принадлежать той же компании, что и договор."
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании, что и договор."
        if self.membership_id and self.membership.company_id != self.company_id:
            errors["membership"] = "Абонемент должен принадлежать той же компании, что и договор."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def title(self) -> str:
        number = self.number.replace(" ", "")
        formatted_number = f"{number[:2]} {number[2:]}" if len(number) > 2 else number
        date_label = self.contract_date.strftime("%d.%m.%Y")
        client_name = self.client.full_name if self.client_id else ""
        return f"ДОГОВОР № {self.prefix}{formatted_number} от {date_label} с {client_name}"

    def __str__(self) -> str:
        return self.title
