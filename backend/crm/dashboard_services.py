from __future__ import annotations

from django.db.models import Count, Exists, OuterRef, Q, Sum
from django.utils import timezone

from branches.models import Branch
from crm.deal_serializers import KanbanDealSerializer
from crm.models import Deal, DealPipeline, Task
from crm.pipeline_serializers import DealStageSerializer
from crm.pipelines import (
    GENERAL_PIPELINE_SLUG,
    RENEWAL_PIPELINE_SLUG,
    SALES_PIPELINE_SLUG,
    ensure_default_pipeline,
)


def build_sales_analytics(company) -> dict:
    deals = Deal.objects.filter(company=company, pipeline__slug=SALES_PIPELINE_SLUG)
    by_stage = (
        deals.values("stage__code", "stage__name")
        .annotate(count=Count("id"), total_amount=Sum("amount"))
        .order_by("stage__code")
    )
    aggregates = deals.aggregate(
        total=Count("id"),
        won=Count("id", filter=Q(stage__is_won=True)),
        lost=Count("id", filter=Q(stage__is_lost=True)),
        open_deals=Count("id", filter=Q(stage__is_won=False, stage__is_lost=False)),
    )
    total = aggregates["total"] or 0
    won = aggregates["won"] or 0
    return {
        "pipeline_slug": SALES_PIPELINE_SLUG,
        "total_deals": total,
        "open_deals": aggregates["open_deals"] or 0,
        "won_deals": won,
        "lost_deals": aggregates["lost"] or 0,
        "conversion_rate": round(won / total * 100, 1) if total else 0,
        "stages": [
            {
                "code": row["stage__code"],
                "name": row["stage__name"],
                "count": row["count"],
                "total_amount": str(row["total_amount"] or 0),
            }
            for row in by_stage
        ],
    }


def build_renewal_analytics(company) -> dict:
    deals = Deal.objects.filter(company=company, pipeline__slug=RENEWAL_PIPELINE_SLUG)
    by_stage = (
        deals.values("stage__code", "stage__name")
        .annotate(count=Count("id"), total_amount=Sum("renewal_amount"))
        .order_by("stage__code")
    )
    aggregates = deals.aggregate(
        total=Count("id"),
        renewed=Count("id", filter=Q(stage__is_won=True)),
        not_renewed=Count("id", filter=Q(stage__is_lost=True)),
        open_deals=Count("id", filter=Q(stage__is_won=False, stage__is_lost=False)),
        overdue=Count(
            "id",
            filter=Q(stage__code="renewal_overdue", stage__is_won=False, stage__is_lost=False),
        ),
    )
    total = aggregates["total"] or 0
    renewed = aggregates["renewed"] or 0
    return {
        "pipeline_slug": RENEWAL_PIPELINE_SLUG,
        "total_deals": total,
        "open_deals": aggregates["open_deals"] or 0,
        "renewed_deals": renewed,
        "not_renewed_deals": aggregates["not_renewed"] or 0,
        "overdue_deals": aggregates["overdue"] or 0,
        "renewal_rate": round(renewed / total * 100, 1) if total else 0,
        "stages": [
            {
                "code": row["stage__code"],
                "name": row["stage__name"],
                "count": row["count"],
                "total_amount": str(row["total_amount"] or 0),
            }
            for row in by_stage
        ],
    }


def analytics_for_pipeline_slug(company, slug: str) -> dict | None:
    if slug in {SALES_PIPELINE_SLUG, GENERAL_PIPELINE_SLUG}:
        return build_sales_analytics(company)
    if slug == RENEWAL_PIPELINE_SLUG:
        return build_renewal_analytics(company)
    return None


def _kanban_base_queryset(*, company, pipeline: DealPipeline, search: str):
    qs = Deal.objects.filter(company=company, pipeline=pipeline).select_related(
        "client",
        "assigned_to",
        "stage",
        "pipeline",
        "membership",
    )
    if search:
        qs = qs.filter(
            Q(title__icontains=search)
            | Q(client__first_name__icontains=search)
            | Q(client__last_name__icontains=search)
            | Q(contact_name__icontains=search)
            | Q(contact_phone__icontains=search)
        )

    overdue_tasks = Task.objects.filter(
        deal_id=OuterRef("pk"),
        status__in=[Task.Status.OPEN, Task.Status.IN_PROGRESS],
        due_at__lt=timezone.now(),
    )
    return qs.annotate(has_overdue_task=Exists(overdue_tasks))


def fetch_kanban_deals(*, company, pipeline: DealPipeline, search: str, per_stage: int) -> list[Deal]:
    """По N сделок на этап — отдельный LIMIT-запрос на этап (быстро при 10k+ в колонке)."""
    stage_ids = list(pipeline.stages.order_by("sort_order", "id").values_list("id", flat=True))
    if not stage_ids:
        return []

    base_qs = _kanban_base_queryset(company=company, pipeline=pipeline, search=search)
    deals: list[Deal] = []
    for stage_id in stage_ids:
        deals.extend(list(base_qs.filter(stage_id=stage_id).order_by("-created_at")[:per_stage]))
    return deals


def fetch_kanban_stage_deals(
    *,
    company,
    pipeline: DealPipeline,
    stage_id: int,
    search: str,
    offset: int,
    limit: int,
) -> list[Deal]:
    return list(
        _kanban_base_queryset(company=company, pipeline=pipeline, search=search)
        .filter(stage_id=stage_id)
        .order_by("-created_at")[offset : offset + limit]
    )


def serialize_kanban_deals(deals: list[Deal], *, request, company) -> list[dict]:
    return KanbanDealSerializer(deals, many=True, context={"request": request, "company": company}).data


def fetch_stage_deal_counts(*, company, pipeline_id: int) -> dict[int, int]:
    return {
        stage_id: count
        for stage_id, count in Deal.objects.filter(company=company, pipeline_id=pipeline_id)
        .values("stage_id")
        .annotate(c=Count("id"))
        .values_list("stage_id", "c")
    }


def attach_stage_deal_counts(stages, counts: dict[int, int]) -> list:
    stage_list = list(stages)
    for stage in stage_list:
        stage.deals_count = counts.get(stage.id, 0)
    return stage_list


def build_analytics_summary_from_stages(stages) -> dict:
    stage_list = list(stages)
    total_deals = sum(getattr(stage, "deals_count", 0) for stage in stage_list)
    open_deals = sum(
        getattr(stage, "deals_count", 0) for stage in stage_list if not stage.is_won and not stage.is_lost
    )
    return {
        "total_deals": total_deals,
        "open_deals": open_deals,
    }


def build_crm_dashboard_payload(
    *,
    request,
    company,
    pipeline_id: int | None,
    search: str,
    per_stage: int,
) -> dict:
    ensure_default_pipeline(company)

    pipelines_qs = (
        DealPipeline.objects.filter(company=company, is_active=True)
        .order_by("sort_order", "id")
        .only("id", "name", "slug", "is_default", "sort_order", "is_active")
    )
    pipeline_summaries = [
        {
            "id": pipeline.id,
            "name": pipeline.name,
            "slug": pipeline.slug,
            "is_default": pipeline.is_default,
            "sort_order": pipeline.sort_order,
            "is_active": pipeline.is_active,
            "stages": [],
        }
        for pipeline in pipelines_qs
    ]

    active_pipeline = (
        pipelines_qs.filter(id=pipeline_id).first()
        if pipeline_id
        else pipelines_qs.filter(is_default=True).first() or pipelines_qs.first()
    )
    if not active_pipeline:
        return {
            "pipelines": [],
            "active_pipeline": None,
            "deals": [],
            "analytics_summary": None,
            "branches": [],
            "per_stage": per_stage,
        }

    active_pipeline = DealPipeline.objects.filter(pk=active_pipeline.pk).prefetch_related("stages").first()
    stage_counts = fetch_stage_deal_counts(company=company, pipeline_id=active_pipeline.id)
    stages = attach_stage_deal_counts(
        active_pipeline.stages.order_by("sort_order", "id"),
        stage_counts,
    )
    active_pipeline_data = {
        "id": active_pipeline.id,
        "name": active_pipeline.name,
        "slug": active_pipeline.slug,
        "is_default": active_pipeline.is_default,
        "sort_order": active_pipeline.sort_order,
        "is_active": active_pipeline.is_active,
        "stages": DealStageSerializer(stages, many=True).data,
    }

    deals = fetch_kanban_deals(
        company=company,
        pipeline=active_pipeline,
        search=search,
        per_stage=per_stage,
    )

    branches = list(
        Branch.objects.filter(company=company, is_active=True)
        .order_by("-is_primary", "name")
        .values("id", "name", "slug", "is_primary")
    )

    return {
        "pipelines": pipeline_summaries,
        "active_pipeline": active_pipeline_data,
        "deals": serialize_kanban_deals(deals, request=request, company=company),
        "analytics_summary": build_analytics_summary_from_stages(stages),
        "branches": branches,
        "per_stage": per_stage,
    }
