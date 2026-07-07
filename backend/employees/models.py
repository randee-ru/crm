from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from branches.models import Branch
from companies.models import Company
from core.models import TimeStampedModel


class Trainer(TimeStampedModel):
    """Тренер или инструктор фитнес-клуба."""

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="trainers",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trainers",
        verbose_name="Филиал",
    )
    first_name = models.CharField("Имя", max_length=100)
    middle_name = models.CharField("Отчество", max_length=100, blank=True)
    last_name = models.CharField("Фамилия", max_length=100)
    phone = models.CharField("Телефон", max_length=32, blank=True, null=True)
    email = models.EmailField("Email", blank=True)
    specialization = models.CharField("Специализация", max_length=255, blank=True)
    photo = models.ImageField("Фото", upload_to="trainers/%Y/%m/", null=True, blank=True)
    achievements = models.TextField("Заслуги и регалии", blank=True)
    bio = models.TextField(
        "Описание",
        blank=True,
        help_text="Публичное описание тренера — выгружается на сайт и в приложение.",
    )
    trains_gym_floor = models.BooleanField("Тренажёрный зал", default=False)
    trains_group_programs = models.BooleanField("Групповые программы", default=False)
    is_active = models.BooleanField("Активен", default=True)

    class Meta:
        verbose_name = "Тренер"
        verbose_name_plural = "Тренеры"
        ordering = ["last_name", "first_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "phone"],
                condition=Q(phone__isnull=False),
                name="uniq_trainer_phone_per_company",
            )
        ]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании, что и тренер."
        if not self.trains_gym_floor and not self.trains_group_programs:
            errors["trains_gym_floor"] = "Укажите хотя бы один тип работы тренера."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        if self.phone is not None:
            self.phone = self.phone.strip() or None
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def full_name(self) -> str:
        return " ".join(part for part in [self.first_name, self.middle_name, self.last_name] if part).strip()

    def __str__(self) -> str:
        return f"{self.full_name} ({self.phone or 'без телефона'})"


class TrainerRentPayment(TimeStampedModel):
    """Оплата аренды тренажёрного зала персональным тренером за календарный месяц."""

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="trainer_rent_payments",
        verbose_name="Компания",
    )
    trainer = models.ForeignKey(
        Trainer,
        on_delete=models.CASCADE,
        related_name="rent_payments",
        verbose_name="Тренер",
    )
    period = models.DateField("Месяц аренды", help_text="Хранится как первое число месяца")
    amount = models.DecimalField("Сумма", max_digits=10, decimal_places=2)
    paid_at = models.DateTimeField("Дата оплаты")
    note = models.CharField("Комментарий", max_length=255, blank=True)

    class Meta:
        verbose_name = "Оплата аренды тренера"
        verbose_name_plural = "Оплаты аренды тренеров"
        ordering = ["-period", "-paid_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["trainer", "period"],
                name="uniq_trainer_rent_period",
            )
        ]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.trainer_id and self.company_id and self.trainer.company_id != self.company_id:
            errors["trainer"] = "Тренер должен принадлежать той же компании, что и оплата аренды."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        if self.period:
            self.period = self.period.replace(day=1)
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.trainer} — {self.period:%Y-%m}"


class TrainerAccessCard(TimeStampedModel):
    """Карта доступа (СКУД/RFID), выданная тренеру."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Активна"
        BLOCKED = "blocked", "Заблокирована"
        LOST = "lost", "Утеряна"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="trainer_access_cards",
        verbose_name="Компания",
    )
    trainer = models.ForeignKey(
        Trainer,
        on_delete=models.CASCADE,
        related_name="access_cards",
        verbose_name="Тренер",
    )
    card_number = models.CharField("Номер карты", max_length=64)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.ACTIVE)
    issued_at = models.DateTimeField("Дата выдачи")
    note = models.CharField("Комментарий", max_length=255, blank=True)

    class Meta:
        verbose_name = "Карта доступа тренера"
        verbose_name_plural = "Карты доступа тренеров"
        ordering = ["-issued_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "card_number"],
                name="uniq_trainer_card_number_per_company",
            )
        ]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.trainer_id and self.company_id and self.trainer.company_id != self.company_id:
            errors["trainer"] = "Тренер должен принадлежать той же компании, что и карта доступа."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.trainer} — карта №{self.card_number}"
