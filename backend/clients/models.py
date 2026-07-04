from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from branches.models import Branch
from companies.models import Company
from core.models import TimeStampedModel


class Client(TimeStampedModel):
    """Клиент фитнес-клуба.

    Клиент всегда принадлежит конкретной компании, а иногда и конкретному филиалу.
    Это помогает хранить данные разных клубов отдельно и без пересечений.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="clients",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clients",
        verbose_name="Филиал",
    )
    first_name = models.CharField("Имя", max_length=100)
    last_name = models.CharField("Фамилия", max_length=100)
    phone = models.CharField("Телефон", max_length=32)
    email = models.EmailField("Email", blank=True)
    birth_date = models.DateField("Дата рождения", null=True, blank=True)
    notes = models.TextField("Комментарий", blank=True)
    is_active = models.BooleanField("Активен", default=True)

    class Meta:
        verbose_name = "Клиент"
        verbose_name_plural = "Клиенты"
        ordering = ["last_name", "first_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "phone"],
                name="uniq_client_phone_per_company",
            )
        ]

    def clean(self) -> None:
        # Проверяем границы tenant'а до сохранения,
        # чтобы филиал и компания всегда совпадали друг с другом.
        errors: dict[str, str] = {}
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании, что и клиент."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def full_name(self) -> str:
        # Человекочитаемое имя удобно использовать в админке, отчетах и поиске.
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self) -> str:
        return f"{self.full_name} ({self.phone})"

