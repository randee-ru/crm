from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from branches.models import Branch
from clients.models import Client
from companies.models import Company
from core.models import TimeStampedModel
from crm.choices import ClientInterest, ContactType, LeadSource, LossReason, VisitType


class Task(TimeStampedModel):
    """Задача сотрудника CRM.

    Задача всегда принадлежит компании и может быть связана с клиентом,
    филиалом и ответственным пользователем.
    """

    class Status(models.TextChoices):
        OPEN = "open", "Открыта"
        IN_PROGRESS = "in_progress", "В работе"
        DONE = "done", "Выполнена"
        CANCELLED = "cancelled", "Отменена"

    class Priority(models.TextChoices):
        LOW = "low", "Низкий"
        NORMAL = "normal", "Обычный"
        HIGH = "high", "Высокий"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="tasks",
        verbose_name="Компания",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
        verbose_name="Филиал",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
        verbose_name="Клиент",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
        verbose_name="Ответственный",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_tasks",
        verbose_name="Автор",
    )
    title = models.CharField("Заголовок", max_length=255)
    description = models.TextField("Описание", blank=True)
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    priority = models.CharField(
        "Приоритет",
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
    )
    due_at = models.DateTimeField("Срок", null=True, blank=True)
    deal = models.ForeignKey(
        "Deal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
        verbose_name="Сделка",
    )
    automation_key = models.CharField("Ключ автоматизации", max_length=128, blank=True, db_index=True)

    class Meta:
        verbose_name = "Задача"
        verbose_name_plural = "Задачи"
        ordering = ["due_at", "-created_at"]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании, что и задача."
        if self.client_id and self.client.company_id != self.company_id:
            errors["client"] = "Клиент должен принадлежать той же компании, что и задача."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class Deal(TimeStampedModel):
    """Сделка в воронке CRM.

    Сделка проходит этапы канбана и может быть связана с клиентом.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="deals",
        verbose_name="Компания",
    )
    pipeline = models.ForeignKey(
        "DealPipeline",
        on_delete=models.CASCADE,
        related_name="deals",
        verbose_name="Воронка",
    )
    stage = models.ForeignKey(
        "DealStage",
        on_delete=models.PROTECT,
        related_name="deals",
        verbose_name="Этап",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deals",
        verbose_name="Филиал",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deals",
        verbose_name="Клиент",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_deals",
        verbose_name="Ответственный",
    )
    title = models.CharField("Название", max_length=255)
    description = models.TextField("Описание", blank=True)
    deal_type = models.CharField("Тип сделки", max_length=64, blank=True)
    source_name = models.CharField("Источник", max_length=120, blank=True)
    channel = models.CharField("Канал", max_length=64, blank=True)
    result_label = models.CharField("Результат", max_length=120, blank=True)
    manager_name = models.CharField("Менеджер", max_length=120, blank=True)
    external_key = models.CharField("Ключ импорта", max_length=128, blank=True, db_index=True)
    closed_at = models.DateTimeField("Дата закрытия", null=True, blank=True)
    amount = models.DecimalField("Сумма", max_digits=12, decimal_places=2, default=0)
    # Контактные данные лида (если клиент ещё не создан в CRM)
    contact_name = models.CharField("Имя контакта", max_length=255, blank=True)
    contact_phone = models.CharField("Телефон", max_length=32, blank=True)
    contact_email = models.EmailField("Email", blank=True)
    lead_source = models.CharField(
        "Источник лида",
        max_length=32,
        choices=LeadSource.choices,
        blank=True,
    )
    client_interest = models.CharField(
        "Интерес клиента",
        max_length=32,
        choices=ClientInterest.choices,
        blank=True,
    )
    visit_type = models.CharField(
        "Тип визита",
        max_length=32,
        choices=VisitType.choices,
        blank=True,
    )
    visit_at = models.DateTimeField("Дата визита", null=True, blank=True)
    visit_done_at = models.DateTimeField("Визит состоялся в", null=True, blank=True)
    desired_tariff = models.CharField("Желаемый тариф", max_length=120, blank=True)
    next_contact_at = models.DateTimeField("Следующий контакт", null=True, blank=True)
    manager_comment = models.TextField("Комментарий менеджера", blank=True)
    loss_reason = models.CharField(
        "Причина отказа",
        max_length=32,
        choices=LossReason.choices,
        blank=True,
    )
    follow_up_started_at = models.DateTimeField("Начало повторного контакта", null=True, blank=True)
    # Поля воронки продления
    membership = models.ForeignKey(
        "memberships.Membership",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="renewal_deals",
        verbose_name="Абонемент",
    )
    renewal_amount = models.DecimalField(
        "Сумма продления",
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    proposed_tariff = models.CharField("Предложенный тариф", max_length=120, blank=True)

    class Meta:
        verbose_name = "Сделка"
        verbose_name_plural = "Сделки"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["company", "pipeline", "stage", "-created_at"],
                name="crm_deal_kanban_idx",
            ),
            models.Index(
                fields=["company", "pipeline", "stage"],
                name="crm_deal_pipeline_stage_idx",
            ),
        ]

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.branch_id and self.branch.company_id != self.company_id:
            errors["branch"] = "Филиал должен принадлежать той же компании, что и сделка."
        if self.client_id and self.client.company_id != self.company_id:
            errors["client"] = "Клиент должен принадлежать той же компании, что и сделка."
        if self.pipeline_id and self.pipeline.company_id != self.company_id:
            errors["pipeline"] = "Воронка должна принадлежать той же компании, что и сделка."
        if self.stage_id and self.pipeline_id and self.stage.pipeline_id != self.pipeline_id:
            errors["stage"] = "Этап должен принадлежать выбранной воронке."
        if errors:
            raise ValidationError(errors)

    def save(self, *args: object, **kwargs: object) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def display_name(self) -> str:
        if self.client_id:
            return self.client.full_name
        return self.contact_name or self.title

    @property
    def display_phone(self) -> str:
        if self.client_id and self.client.phone:
            return self.client.phone
        return self.contact_phone

    def days_remaining(self) -> int | None:
        """Оставшиеся дни абонемента (для воронки продления)."""
        if not self.membership_id:
            return None
        from django.utils import timezone

        ends_at = self.membership.ends_at
        return (ends_at - timezone.localdate()).days

    def __str__(self) -> str:
        return self.title


class DealStageHistory(TimeStampedModel):
    """История смены этапов сделки."""

    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        related_name="stage_history",
        verbose_name="Сделка",
    )
    from_stage = models.ForeignKey(
        "DealStage",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="history_from",
        verbose_name="С этапа",
    )
    to_stage = models.ForeignKey(
        "DealStage",
        on_delete=models.PROTECT,
        related_name="history_to",
        verbose_name="На этап",
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deal_stage_changes",
        verbose_name="Кто изменил",
    )
    comment = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "История этапа сделки"
        verbose_name_plural = "История этапов сделок"
        ordering = ["-created_at"]


class DealContactHistory(TimeStampedModel):
    """История контактов по сделке."""

    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        related_name="contact_history",
        verbose_name="Сделка",
    )
    contact_type = models.CharField(
        "Тип контакта",
        max_length=20,
        choices=ContactType.choices,
        default=ContactType.NOTE,
    )
    contacted_at = models.DateTimeField("Дата контакта")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deal_contacts",
        verbose_name="Менеджер",
    )
    comment = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "Контакт по сделке"
        verbose_name_plural = "Контакты по сделкам"
        ordering = ["-contacted_at"]


class DealPipeline(TimeStampedModel):
    """Воронка продаж компании (набор этапов канбана)."""

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="deal_pipelines",
        verbose_name="Компания",
    )
    name = models.CharField("Название", max_length=120)
    slug = models.SlugField("Код", max_length=80)
    is_default = models.BooleanField("По умолчанию", default=False)
    is_active = models.BooleanField("Активна", default=True)
    sort_order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        verbose_name = "Воронка"
        verbose_name_plural = "Воронки"
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "slug"],
                name="uniq_pipeline_slug_per_company",
            )
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.company})"


class DealStage(TimeStampedModel):
    """Этап воронки для канбана CRM."""

    pipeline = models.ForeignKey(
        DealPipeline,
        on_delete=models.CASCADE,
        related_name="stages",
        verbose_name="Воронка",
    )
    name = models.CharField("Название", max_length=120)
    code = models.SlugField("Код", max_length=80)
    color = models.CharField("Цвет", max_length=7, default="#3d5f8f")
    sort_order = models.PositiveIntegerField("Порядок", default=0)
    is_won = models.BooleanField("Успешный этап", default=False)
    is_lost = models.BooleanField("Проигрыш", default=False)

    class Meta:
        verbose_name = "Этап воронки"
        verbose_name_plural = "Этапы воронки"
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["pipeline", "code"],
                name="uniq_stage_code_per_pipeline",
            )
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.pipeline.name})"
