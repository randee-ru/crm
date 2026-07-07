from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from branches.models import Branch
from companies.models import Company
from core.models import TimeStampedModel


class Client(TimeStampedModel):
    """Клиент фитнес-клуба."""

    class ClientStatus(models.TextChoices):
        LEAD = "lead", "Потенциальный"
        ACTIVE = "active", "Действующий"
        FORMER = "former", "Бывший"
        REJECTED = "rejected", "Отказ"

    class Gender(models.TextChoices):
        MALE = "male", "Мужской"
        FEMALE = "female", "Женский"
        UNKNOWN = "unknown", "Не указан"

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
    external_id = models.CharField("ID в 1С", max_length=64, blank=True, db_index=True)
    first_name = models.CharField("Имя", max_length=100)
    last_name = models.CharField("Фамилия", max_length=100)
    middle_name = models.CharField("Отчество", max_length=100, blank=True)
    phone = models.CharField("Телефон", max_length=32)
    email = models.EmailField("Email", blank=True)
    birth_date = models.DateField("Дата рождения", null=True, blank=True)
    gender = models.CharField(
        "Пол",
        max_length=10,
        choices=Gender.choices,
        default=Gender.UNKNOWN,
    )
    passport = models.CharField("Паспорт", max_length=64, blank=True)
    card_number = models.CharField("Номер карты", max_length=64, blank=True)
    card_status = models.CharField("Статус карты", max_length=64, blank=True)
    client_status = models.CharField(
        "Статус клиента",
        max_length=20,
        choices=ClientStatus.choices,
        default=ClientStatus.LEAD,
        blank=True,
    )
    client_status_label = models.CharField("Статус (подпись)", max_length=120, blank=True)
    manager_name = models.CharField("Менеджер", max_length=120, blank=True)
    lead_source = models.CharField("Источник лида", max_length=120, blank=True)
    acquisition_channel = models.CharField("Канал привлечения", max_length=120, blank=True)
    club_name = models.CharField("Клуб", max_length=120, blank=True)
    contract_ref = models.CharField("Договор (ссылка)", max_length=255, blank=True)
    ltv_total = models.DecimalField("LTV", max_digits=12, decimal_places=2, default=0)
    visit_count = models.PositiveIntegerField("Количество визитов", default=0)
    visit_frequency = models.CharField("Частота визитов", max_length=64, blank=True)
    max_break_days = models.PositiveIntegerField("Макс. перерыв (дней)", default=0)
    registration_date = models.DateField("Дата регистрации", null=True, blank=True)
    last_visit_date = models.DateField("Последний визит", null=True, blank=True)
    last_payment_date = models.DateField("Последняя оплата", null=True, blank=True)
    last_interaction_date = models.DateTimeField("Последнее взаимодействие", null=True, blank=True)
    membership_name = models.CharField("Текущий абонемент", max_length=255, blank=True)
    membership_status = models.CharField("Статус абонемента", max_length=64, blank=True)
    membership_start = models.DateField("Абонемент с", null=True, blank=True)
    membership_end = models.DateField("Абонемент до", null=True, blank=True)
    tags = models.JSONField("Теги", default=list, blank=True)
    interests = models.JSONField("Интересы", default=list, blank=True)
    notes = models.TextField("Комментарий", blank=True)
    is_active = models.BooleanField("Активен", default=True)
    is_deleted = models.BooleanField("Удалён в 1С", default=False)

    class Meta:
        verbose_name = "Клиент"
        verbose_name_plural = "Клиенты"
        ordering = ["last_name", "first_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "external_id"],
                condition=models.Q(external_id__gt=""),
                name="uniq_client_external_id_per_company",
            )
        ]

    def clean(self) -> None:
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
        parts = [self.first_name, self.last_name, self.middle_name]
        return " ".join(part for part in parts if part and part != "-").strip() or self.phone

    def __str__(self) -> str:
        return f"{self.full_name} ({self.phone})"


class ClientMessage(TimeStampedModel):
    """Сообщение / звонок / SMS по клиенту из 1С."""

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="client_messages",
        verbose_name="Компания",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Клиент",
    )
    external_key = models.CharField("Ключ импорта", max_length=128, blank=True, db_index=True)
    channel = models.CharField("Канал", max_length=64, blank=True)
    message_type = models.CharField("Тип", max_length=64, blank=True)
    kind = models.CharField("Вид", max_length=64, blank=True)
    source = models.CharField("Источник", max_length=120, blank=True)
    phone = models.CharField("Телефон", max_length=32, blank=True)
    body = models.TextField("Текст", blank=True)
    sent_at = models.DateTimeField("Дата", null=True, blank=True)

    class Meta:
        verbose_name = "Сообщение клиента"
        verbose_name_plural = "Сообщения клиентов"
        ordering = ["-sent_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "external_key"],
                condition=models.Q(external_key__gt=""),
                name="uniq_client_message_external_key",
            )
        ]


class ClientLead(TimeStampedModel):
    """Лид клиента из 1С."""

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="client_leads",
        verbose_name="Компания",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="leads",
        verbose_name="Клиент",
    )
    external_key = models.CharField("Ключ импорта", max_length=128, blank=True, db_index=True)
    title = models.CharField("Название", max_length=255, blank=True)
    status = models.CharField("Статус", max_length=64, blank=True)
    channel = models.CharField("Канал", max_length=64, blank=True)
    club_name = models.CharField("Клуб", max_length=120, blank=True)
    manager_name = models.CharField("Менеджер", max_length=120, blank=True)
    comment = models.TextField("Комментарий", blank=True)
    ad_source = models.CharField("Рекламный источник", max_length=120, blank=True)
    utm_source = models.CharField("UTM source", max_length=120, blank=True)
    utm_medium = models.CharField("UTM medium", max_length=120, blank=True)
    utm_campaign = models.CharField("UTM campaign", max_length=120, blank=True)
    utm_content = models.CharField("UTM content", max_length=120, blank=True)
    utm_term = models.CharField("UTM term", max_length=120, blank=True)
    lead_date = models.DateTimeField("Дата", null=True, blank=True)

    class Meta:
        verbose_name = "Лид клиента"
        verbose_name_plural = "Лиды клиентов"
        ordering = ["-lead_date", "-id"]
