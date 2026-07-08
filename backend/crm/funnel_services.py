"""Автоматизации воронок продаж и продления абонементов."""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from companies.models import Company
from crm.choices import ContactType, LeadSource
from crm.models import Deal, DealContactHistory, DealStageHistory, Task
from crm.pipelines import (
    RENEWAL_PIPELINE_SLUG,
    SALES_PIPELINE_SLUG,
    ensure_default_pipeline,
    get_renewal_pipeline,
    get_stage_by_code,
    renewal_stage_code_for_days,
)
from memberships.models import Membership
from notifications.models import Notification

# Расписание задач при переходе в «Повторный контакт»
FOLLOW_UP_TASK_SCHEDULE: list[tuple[int, str, str, Task.Priority]] = [
    (1, "follow_up_day_1", "Позвонить клиенту (день 1)", Task.Priority.HIGH),
    (3, "follow_up_day_3", "Написать в мессенджер (день 3)", Task.Priority.NORMAL),
    (7, "follow_up_day_7", "Повторный звонок (день 7)", Task.Priority.HIGH),
    (14, "follow_up_day_14", "Финальное предложение (день 14)", Task.Priority.HIGH),
    (21, "follow_up_day_21", "Предложить закрыть как потерянную (день 21)", Task.Priority.NORMAL),
]

# Задачи по этапам продления
RENEWAL_STAGE_TASKS: dict[str, tuple[str, Task.Priority]] = {
    "renewal_30": ("Позвонить по продлению абонемента (30 дней)", Task.Priority.NORMAL),
    "renewal_15": ("Напоминание о продлении (15 дней)", Task.Priority.NORMAL),
    "renewal_7": ("Срочный звонок по продлению (7 дней)", Task.Priority.HIGH),
    "renewal_3": ("Срочно: абонемент заканчивается через 3 дня", Task.Priority.HIGH),
    "renewal_today": ("Абонемент заканчивается сегодня — связаться с клиентом", Task.Priority.HIGH),
    "renewal_overdue": ("Просроченное продление — финальный контакт", Task.Priority.HIGH),
}


def record_stage_change(
    deal: Deal,
    *,
    from_stage_id: int | None,
    to_stage,
    changed_by=None,
    comment: str = "",
) -> DealStageHistory:
    return DealStageHistory.objects.create(
        deal=deal,
        from_stage_id=from_stage_id,
        to_stage=to_stage,
        changed_by=changed_by,
        comment=comment,
    )


def record_contact(
    deal: Deal,
    *,
    contact_type: str,
    comment: str = "",
    user=None,
    contacted_at: datetime | None = None,
) -> DealContactHistory:
    return DealContactHistory.objects.create(
        deal=deal,
        contact_type=contact_type,
        comment=comment,
        user=user or deal.assigned_to,
        contacted_at=contacted_at or timezone.now(),
    )


def apply_stage_side_effects(
    deal: Deal,
    *,
    old_stage,
    new_stage,
    changed_by=None,
) -> None:
    """Побочные эффекты при смене этапа: таймстампы, задачи, closed_at."""
    now = timezone.now()
    update_fields: list[str] = []

    if new_stage.code == "visit_done" and old_stage.code != "visit_done":
        deal.visit_done_at = now
        update_fields.append("visit_done_at")

    if new_stage.code == "follow_up" and old_stage.code != "follow_up":
        deal.follow_up_started_at = now
        update_fields.append("follow_up_started_at")
        _schedule_follow_up_tasks(deal, started_at=now)

    if new_stage.is_won or new_stage.is_lost:
        if not deal.closed_at:
            deal.closed_at = now
            update_fields.append("closed_at")

    if update_fields:
        deal.save(update_fields=update_fields + ["updated_at"])

    if new_stage.code in RENEWAL_STAGE_TASKS and deal.pipeline.slug == RENEWAL_PIPELINE_SLUG:
        _ensure_renewal_stage_task(deal, new_stage.code)


def _schedule_follow_up_tasks(deal: Deal, *, started_at: datetime) -> None:
    for day_offset, key, title, priority in FOLLOW_UP_TASK_SCHEDULE:
        automation_key = f"deal:{deal.pk}:{key}"
        if Task.objects.filter(company=deal.company, automation_key=automation_key).exists():
            continue
        Task.objects.create(
            company=deal.company,
            branch=deal.branch,
            client=deal.client,
            deal=deal,
            assigned_to=deal.assigned_to,
            title=title,
            description=f"Автозадача по сделке «{deal.title}»",
            status=Task.Status.OPEN,
            priority=priority,
            due_at=started_at + timedelta(days=day_offset),
            automation_key=automation_key,
        )


def _ensure_renewal_stage_task(deal: Deal, stage_code: str) -> None:
    title, priority = RENEWAL_STAGE_TASKS[stage_code]
    automation_key = f"deal:{deal.pk}:renewal:{stage_code}"
    if Task.objects.filter(company=deal.company, automation_key=automation_key).exists():
        return
    Task.objects.create(
        company=deal.company,
        branch=deal.branch,
        client=deal.client,
        deal=deal,
        assigned_to=deal.assigned_to,
        title=title,
        description=f"Автозадача продления: {deal.title}",
        status=Task.Status.OPEN,
        priority=priority,
        due_at=timezone.now() + timedelta(hours=4),
        automation_key=automation_key,
    )


def move_visit_done_to_follow_up(company: Company | None = None) -> int:
    """Переводит сделки из visit_done в follow_up, если прошло 2+ часа без покупки."""
    now = timezone.now()
    threshold = now - timedelta(hours=2)
    queryset = Deal.objects.filter(
        pipeline__slug=SALES_PIPELINE_SLUG,
        stage__code="visit_done",
        visit_done_at__isnull=False,
        visit_done_at__lte=threshold,
        closed_at__isnull=True,
    ).select_related("pipeline", "stage")

    if company:
        queryset = queryset.filter(company=company)

    moved = 0
    for deal in queryset:
        try:
            follow_up_stage = get_stage_by_code(deal.pipeline, "follow_up")
        except Exception:
            continue
        old_stage = deal.stage
        deal.stage = follow_up_stage
        deal.save(update_fields=["stage", "updated_at"])
        record_stage_change(deal, from_stage_id=old_stage.id, to_stage=follow_up_stage, comment="Авто: 2ч после визита")
        apply_stage_side_effects(deal, old_stage=old_stage, new_stage=follow_up_stage)
        moved += 1
    return moved


def create_renewal_deals(company: Company) -> int:
    """Создаёт сделки продления для абонементов, заканчивающихся в ближайшие 30 дней."""
    pipeline = get_renewal_pipeline(company)
    today = timezone.localdate()
    horizon = today + timedelta(days=30)

    memberships = Membership.objects.filter(
        company=company,
        status=Membership.Status.ACTIVE,
        ends_at__gte=today,
        ends_at__lte=horizon,
    ).select_related("client", "branch")

    created = 0
    for membership in memberships:
        external_key = f"renewal:membership:{membership.pk}"
        if Deal.objects.filter(company=company, external_key=external_key).exists():
            continue

        days_left = (membership.ends_at - today).days
        stage_code = renewal_stage_code_for_days(days_left)
        try:
            stage = get_stage_by_code(pipeline, stage_code)
        except Exception:
            stage = get_stage_by_code(pipeline, "renewal_30")

        client = membership.client
        deal = Deal.objects.create(
            company=company,
            pipeline=pipeline,
            stage=stage,
            branch=membership.branch,
            client=client,
            membership=membership,
            title=f"Продление: {client.full_name}",
            contact_name=client.full_name,
            contact_phone=client.phone,
            contact_email=client.email,
            amount=membership.price,
            renewal_amount=membership.price,
            proposed_tariff=membership.title,
            external_key=external_key,
            lead_source=LeadSource.OTHER,
        )
        record_stage_change(deal, from_stage_id=None, to_stage=stage, comment="Авто: создание сделки продления")
        _ensure_renewal_stage_task(deal, stage.code)
        created += 1
    return created


def update_renewal_stages(company: Company) -> int:
    """Обновляет этапы сделок продления по оставшимся дням абонемента."""
    pipeline = get_renewal_pipeline(company)
    deals = Deal.objects.filter(
        company=company,
        pipeline=pipeline,
        closed_at__isnull=True,
        membership__isnull=False,
    ).exclude(stage__is_won=True).exclude(stage__is_lost=True).select_related("stage", "membership")

    updated = 0
    for deal in deals:
        days_left = deal.days_remaining()
        if days_left is None:
            continue
        target_code = renewal_stage_code_for_days(days_left)
        if deal.stage.code == target_code:
            continue
        try:
            new_stage = get_stage_by_code(pipeline, target_code)
        except Exception:
            continue
        old_stage = deal.stage
        deal.stage = new_stage
        deal.save(update_fields=["stage", "updated_at"])
        record_stage_change(
            deal,
            from_stage_id=old_stage.id,
            to_stage=new_stage,
            comment=f"Авто: осталось {days_left} дн.",
        )
        apply_stage_side_effects(deal, old_stage=old_stage, new_stage=new_stage)
        updated += 1
    return updated


def notify_overdue_renewal_tasks(company: Company) -> int:
    """Уведомляет менеджера о просроченных задачах на этапе renewal_3."""
    now = timezone.now()
    overdue_tasks = Task.objects.filter(
        company=company,
        deal__pipeline__slug=RENEWAL_PIPELINE_SLUG,
        deal__stage__code="renewal_3",
        status__in=[Task.Status.OPEN, Task.Status.IN_PROGRESS],
        due_at__lt=now,
        deal__assigned_to__isnull=False,
    ).select_related("deal", "deal__assigned_to")

    notified = 0
    for task in overdue_tasks:
        recipient = task.deal.assigned_to
        source_id = f"task-overdue:{task.pk}"
        if Notification.objects.filter(
            company=company,
            recipient=recipient,
            source_object_id=source_id,
        ).exists():
            continue
        Notification.objects.create(
            company=company,
            recipient=recipient,
            kind=Notification.Kind.WARNING,
            title="Просрочена задача по продлению",
            body=f"«{task.title}» — сделка «{task.deal.title}»",
            target_url=f"/dashboard?pipeline={task.deal.pipeline_id}&deal={task.deal_id}",
            source_app="crm",
            source_model="Task",
            source_object_id=source_id,
        )
        notified += 1
    return notified


@transaction.atomic
def run_funnel_automation_for_company(company: Company) -> dict[str, int]:
    """Запускает все автоматизации воронок для одной компании."""
    ensure_default_pipeline(company)
    return {
        "visit_to_follow_up": move_visit_done_to_follow_up(company),
        "renewal_deals_created": create_renewal_deals(company),
        "renewal_stages_updated": update_renewal_stages(company),
        "overdue_notifications": notify_overdue_renewal_tasks(company),
    }


def run_funnel_automation_all() -> dict[str, int]:
    """Запускает автоматизации для всех активных компаний."""
    totals = {
        "visit_to_follow_up": 0,
        "renewal_deals_created": 0,
        "renewal_stages_updated": 0,
        "overdue_notifications": 0,
    }
    for company in Company.objects.filter(is_active=True):
        result = run_funnel_automation_for_company(company)
        for key, value in result.items():
            totals[key] += value
    return totals
