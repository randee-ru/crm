from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from branches.models import Branch
from clients.models import Client
from companies.models import Company
from core.models import TimeStampedModel
from employees.models import Trainer


class ScheduleEvent(TimeStampedModel):
    """Событие расписания фитнес-клуба."""

    class Status(models.TextChoices):
        PLANNED = "planned", "Запланировано"
        COMPLETED = "completed", "Завершено"
        CANCELLED = "cancelled", "Отменено"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="schedule_events",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="schedule_events",
        verbose_name="Филиал",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="schedule_events",
        verbose_name="Клиент",
    )
    trainer = models.ForeignKey(
        Trainer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="schedule_events",
        verbose_name="Тренер",
    )
    title = models.CharField("Название", max_length=255)
    trainer_name = models.CharField("Тренер", max_length=120, blank=True)
    room = models.CharField("Зал", max_length=120, blank=True)
    starts_at = models.DateTimeField("Начало")
    ends_at = models.DateTimeField("Окончание")
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
    )
    notes = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "Событие расписания"
        verbose_name_plural = "События расписания"
        ordering = ["starts_at"]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании, что и событие."
        if self.client_id and self.client.company_id != self.company_id:
            errors["client"] = "Клиент должен принадлежать той же компании, что и событие."
        if self.trainer_id and self.trainer.company_id != self.company_id:
            errors["trainer"] = "Тренер должен принадлежать той же компании, что и событие."
        if self.ends_at and self.starts_at and self.ends_at < self.starts_at:
            errors["ends_at"] = "Окончание не может быть раньше начала."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.title} ({self.starts_at:%d.%m.%Y %H:%M})"


class GroupProgram(TimeStampedModel):
    """Каталог групповых программ клуба."""

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="group_programs",
        verbose_name="Компания",
    )
    title = models.CharField("Название", max_length=160)
    code = models.CharField("Код", max_length=64, blank=True)
    description = models.TextField("Описание", blank=True)
    color = models.CharField("Цвет", max_length=16, default="#2f6fed")
    sort_order = models.PositiveIntegerField("Порядок", default=0)
    is_active = models.BooleanField("Активна", default=True)

    class Meta:
        verbose_name = "Групповая программа"
        verbose_name_plural = "Групповые программы"
        ordering = ["sort_order", "title"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "title"],
                name="uniq_group_program_title_per_company",
            )
        ]

    def __str__(self) -> str:
        return self.title


class GroupScheduleSlot(TimeStampedModel):
    """Слот группового занятия в недельном расписании."""

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="group_schedule_slots",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="group_schedule_slots",
        verbose_name="Филиал",
    )
    program = models.ForeignKey(
        GroupProgram,
        on_delete=models.CASCADE,
        related_name="schedule_slots",
        verbose_name="Программа",
    )
    trainer = models.ForeignKey(
        Trainer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="group_schedule_slots",
        verbose_name="Тренер",
    )
    session_date = models.DateField("Дата занятия")
    start_time = models.TimeField("Начало")
    end_time = models.TimeField("Окончание")
    room = models.CharField("Зал", max_length=120, blank=True)
    trainer_name = models.CharField("Имя тренера", max_length=120, blank=True)
    description = models.TextField("Описание", blank=True)
    restrictions = models.TextField("Ограничения", blank=True)
    custom_title = models.CharField("Своё название", max_length=160, blank=True)
    color = models.CharField("Цвет", max_length=16, blank=True)
    max_participants = models.PositiveSmallIntegerField(
        "Макс. участников",
        null=True,
        blank=True,
        help_text="Пусто — использовать значение из настроек компании.",
    )
    is_active = models.BooleanField("Активен", default=True)

    class Meta:
        verbose_name = "Слот группового расписания"
        verbose_name_plural = "Слоты группового расписания"
        ordering = ["session_date", "start_time", "id"]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.program_id and self.program.company_id != self.company_id:
            errors["program"] = "Программа должна принадлежать той же компании."
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании."
        if self.trainer_id and self.trainer.company_id != self.company_id:
            errors["trainer"] = "Тренер должен принадлежать той же компании."
        if self.end_time and self.start_time and self.end_time <= self.start_time:
            errors["end_time"] = "Окончание должно быть позже начала."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.program.title} · {self.session_date:%d.%m.%Y} {self.start_time:%H:%M}"


class ScheduleSettings(TimeStampedModel):
    """Настройки группового расписания компании."""

    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name="schedule_settings",
        verbose_name="Компания",
    )
    default_max_participants = models.PositiveSmallIntegerField(
        "Макс. участников по умолчанию",
        default=20,
    )
    sms_reminder_hours = models.JSONField(
        "Напоминания SMS (часы до занятия)",
        default=list,
        blank=True,
        help_text="Например: [24, 2] — за сутки и за 2 часа.",
    )
    is_published = models.BooleanField("Опубликовано на сайте", default=False)
    publish_weeks_ahead = models.PositiveSmallIntegerField(
        "Недель в публичном виджете",
        default=4,
    )
    embed_token = models.CharField("Токен встраивания", max_length=64, blank=True, db_index=True)

    class Meta:
        verbose_name = "Настройки расписания"
        verbose_name_plural = "Настройки расписания"

    def __str__(self) -> str:
        return f"Расписание · {self.company.slug}"

    def save(self, *args: object, **kwargs: object) -> None:
        if not self.sms_reminder_hours:
            self.sms_reminder_hours = [24, 2]
        super().save(*args, **kwargs)


class ScheduleSmsIntegration(TimeStampedModel):
    """SMS-провайдер для напоминаний о групповых занятиях."""

    class Provider(models.TextChoices):
        NONE = "none", "Не подключено"
        SMS_RU = "sms_ru", "SMS.ru"
        SMSC = "smsc", "SMSC.ru"
        SMS_AERO = "sms_aero", "SMS Aero"
        TWILIO = "twilio", "Twilio"
        WEBHOOK = "webhook", "Webhook"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="schedule_sms_integrations",
        verbose_name="Компания",
    )
    provider = models.CharField(
        "Провайдер",
        max_length=20,
        choices=Provider.choices,
        default=Provider.NONE,
    )
    title = models.CharField("Название", max_length=120, blank=True)
    api_key = models.CharField("API Key", max_length=255, blank=True)
    api_secret = models.CharField("API Secret", max_length=255, blank=True)
    sender_name = models.CharField("Имя отправителя", max_length=32, blank=True)
    webhook_url = models.URLField("Webhook URL", blank=True)
    settings = models.JSONField("Доп. настройки", default=dict, blank=True)
    is_active = models.BooleanField("Активна", default=True)
    is_primary = models.BooleanField("Основной", default=False)

    class Meta:
        verbose_name = "SMS-интеграция расписания"
        verbose_name_plural = "SMS-интеграции расписания"
        ordering = ["-is_primary", "title", "id"]

    def __str__(self) -> str:
        label = self.title or self.get_provider_display()
        return f"{self.company.slug} · {label}"


class GroupSlotEnrollment(TimeStampedModel):
    """Запись клиента на слот группового занятия."""

    class Status(models.TextChoices):
        CONFIRMED = "confirmed", "Подтверждена"
        CANCELLED = "cancelled", "Отменена"
        WAITLIST = "waitlist", "Лист ожидания"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="group_slot_enrollments",
        verbose_name="Компания",
    )
    slot = models.ForeignKey(
        GroupScheduleSlot,
        on_delete=models.CASCADE,
        related_name="enrollments",
        verbose_name="Слот",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="group_slot_enrollments",
        verbose_name="Клиент",
    )
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.CONFIRMED,
    )
    notes = models.CharField("Комментарий", max_length=255, blank=True)

    class Meta:
        verbose_name = "Запись на групповое занятие"
        verbose_name_plural = "Записи на групповые занятия"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["slot", "client"],
                name="uniq_group_slot_client",
            )
        ]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.slot_id and self.slot.company_id != self.company_id:
            errors["slot"] = "Слот должен принадлежать той же компании."
        if self.client_id and self.client.company_id != self.company_id:
            errors["client"] = "Клиент должен принадлежать той же компании."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        if self.slot_id and not self.company_id:
            self.company_id = self.slot.company_id
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.client} → {self.slot}"
