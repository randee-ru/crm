from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from branches.models import Branch
from clients.models import Client
from companies.models import Company
from core.models import TimeStampedModel
from employees.models import Trainer
from memberships.models import Membership


class Booking(TimeStampedModel):
    """Бронирование тренировки, записи на услугу или визита."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        CONFIRMED = "confirmed", "Подтверждено"
        COMPLETED = "completed", "Завершено"
        CANCELLED = "cancelled", "Отменено"
        NO_SHOW = "no_show", "Не пришёл"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="bookings",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
        verbose_name="Филиал",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
        verbose_name="Клиент",
    )
    membership = models.ForeignKey(
        Membership,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
        verbose_name="Абонемент",
    )
    trainer = models.ForeignKey(
        Trainer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
        verbose_name="Тренер",
    )
    title = models.CharField("Название", max_length=255)
    starts_at = models.DateTimeField("Начало")
    ends_at = models.DateTimeField("Окончание")
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    source = models.CharField("Источник", max_length=120, blank=True)
    room = models.CharField("Зал", max_length=120, blank=True)
    lesson_type = models.CharField("Тип занятия", max_length=120, blank=True)
    payment_basis = models.CharField("Основание оплаты", max_length=120, blank=True)
    external_key = models.CharField("Ключ импорта", max_length=128, blank=True, db_index=True)
    notes = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "Бронирование"
        verbose_name_plural = "Бронирования"
        ordering = ["starts_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "external_key"],
                condition=models.Q(external_key__gt=""),
                name="uniq_booking_external_key",
            )
        ]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании, что и бронирование."
        if self.client_id and self.client.company_id != self.company_id:
            errors["client"] = "Клиент должен принадлежать той же компании, что и бронирование."
        if self.membership_id and self.membership.company_id != self.company_id:
            errors["membership"] = "Абонемент должен принадлежать той же компании, что и бронирование."
        if self.client_id and self.membership_id and self.membership.client_id != self.client_id:
            errors["membership"] = "Абонемент должен быть связан с выбранным клиентом."
        if self.trainer_id and self.trainer.company_id != self.company_id:
            errors["trainer"] = "Тренер должен принадлежать той же компании, что и бронирование."
        if self.ends_at and self.starts_at and self.ends_at < self.starts_at:
            errors["ends_at"] = "Окончание не может быть раньше начала."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.title} ({self.starts_at:%d.%m.%Y %H:%M})"
