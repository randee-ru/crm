from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from branches.models import Branch
from clients.models import Client
from companies.models import Company
from core.models import TimeStampedModel
from employees.models import Trainer
from memberships.models import Membership


class AttendanceRecord(TimeStampedModel):
    """Факт посещения клиента или тренировки."""

    class Status(models.TextChoices):
        CHECKED_IN = "checked_in", "Пришёл"
        LATE = "late", "Опоздал"
        NO_SHOW = "no_show", "Не пришёл"
        CANCELLED = "cancelled", "Отменено"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="attendance_records",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_records",
        verbose_name="Филиал",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="attendance_records",
        verbose_name="Клиент",
    )
    membership = models.ForeignKey(
        Membership,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_records",
        verbose_name="Абонемент",
    )
    trainer = models.ForeignKey(
        Trainer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_records",
        verbose_name="Тренер",
    )
    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_record",
        verbose_name="Бронирование",
    )
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.CHECKED_IN,
    )
    checked_in_at = models.DateTimeField("Время входа", null=True, blank=True)
    checked_out_at = models.DateTimeField("Время выхода", null=True, blank=True)
    locker_key = models.CharField("Ключ/шкафчик", max_length=32, blank=True)
    room = models.CharField("Зал", max_length=120, blank=True)
    visit_source = models.CharField("Источник прохода", max_length=120, blank=True)
    duration_minutes = models.PositiveIntegerField("Длительность (мин)", null=True, blank=True)
    external_key = models.CharField("Ключ импорта", max_length=128, blank=True, db_index=True)
    notes = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "Посещение"
        verbose_name_plural = "Посещения"
        ordering = ["-checked_in_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "external_key"],
                condition=models.Q(external_key__gt=""),
                name="uniq_attendance_external_key",
            )
        ]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании, что и посещение."
        if self.client_id and self.client.company_id != self.company_id:
            errors["client"] = "Клиент должен принадлежать той же компании, что и посещение."
        if self.membership_id and self.membership.company_id != self.company_id:
            errors["membership"] = "Абонемент должен принадлежать той же компании, что и посещение."
        if self.client_id and self.membership_id and self.membership.client_id != self.client_id:
            errors["membership"] = "Абонемент должен быть связан с выбранным клиентом."
        if self.trainer_id and self.trainer.company_id != self.company_id:
            errors["trainer"] = "Тренер должен принадлежать той же компании, что и посещение."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.client.full_name} — {self.status}"
