"""Сервис воронок продаж для фитнес-клубов."""

from __future__ import annotations

from companies.models import Company
from crm.models import Deal, DealPipeline, DealStage

FITNESS_PIPELINE_NAME = "Продажи абонементов"
FITNESS_PIPELINE_SLUG = "membership-sales"

DEFAULT_FITNESS_STAGES: list[dict] = [
    {
        "name": "Новая заявка",
        "code": "new_lead",
        "color": "#3d5f8f",
        "sort_order": 10,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Пробное занятие",
        "code": "trial",
        "color": "#4a90d9",
        "sort_order": 20,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Визит состоялся",
        "code": "trial_done",
        "color": "#2eb8d4",
        "sort_order": 30,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Коммерческое предложение",
        "code": "offer",
        "color": "#3dba5c",
        "sort_order": 40,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Ожидает оплату",
        "code": "payment",
        "color": "#e8a020",
        "sort_order": 50,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Абонемент оформлен",
        "code": "won",
        "color": "#2fa34d",
        "sort_order": 60,
        "is_won": True,
        "is_lost": False,
    },
    {
        "name": "Отказ",
        "code": "lost",
        "color": "#8b98a8",
        "sort_order": 70,
        "is_won": False,
        "is_lost": True,
    },
]

LEGACY_STAGE_MAP = {
    "new": "new_lead",
    "preparation": "trial",
    "prepayment": "payment",
    "in_progress": "offer",
    "final_invoice": "payment",
}


def ensure_default_pipeline(company: Company) -> DealPipeline:
    pipeline, created = DealPipeline.objects.get_or_create(
        company=company,
        slug=FITNESS_PIPELINE_SLUG,
        defaults={
            "name": FITNESS_PIPELINE_NAME,
            "is_default": True,
            "is_active": True,
            "sort_order": 0,
        },
    )

    if created or not pipeline.stages.exists():
        for stage_data in DEFAULT_FITNESS_STAGES:
            DealStage.objects.update_or_create(
                pipeline=pipeline,
                code=stage_data["code"],
                defaults=stage_data,
            )

    if not pipeline.is_default:
        DealPipeline.objects.filter(company=company, is_default=True).exclude(id=pipeline.id).update(
            is_default=False
        )
        pipeline.is_default = True
        pipeline.save(update_fields=["is_default", "updated_at"])

    return pipeline


def get_default_pipeline(company: Company) -> DealPipeline:
    pipeline = (
        DealPipeline.objects.filter(company=company, is_active=True, is_default=True)
        .prefetch_related("stages")
        .first()
    )
    if pipeline:
        return pipeline
    return ensure_default_pipeline(company)


def get_pipeline_for_company(company: Company, pipeline_id: int | None = None) -> DealPipeline:
    if pipeline_id:
        return DealPipeline.objects.prefetch_related("stages").get(
            id=pipeline_id,
            company=company,
            is_active=True,
        )
    return get_default_pipeline(company)


def get_stage_by_code(pipeline: DealPipeline, code: str) -> DealStage:
    return pipeline.stages.get(code=code)


def assign_deal_to_stage(deal: Deal, stage: DealStage) -> None:
    if stage.pipeline_id != deal.pipeline_id:
        raise ValueError("Этап должен принадлежать воронке сделки.")
    deal.stage = stage
    deal.save(update_fields=["stage", "updated_at"])


_RU_TO_LATIN = str.maketrans(
    {
        "а": "a",
        "б": "b",
        "в": "v",
        "г": "g",
        "д": "d",
        "е": "e",
        "ё": "e",
        "ж": "zh",
        "з": "z",
        "и": "i",
        "й": "y",
        "к": "k",
        "л": "l",
        "м": "m",
        "н": "n",
        "о": "o",
        "п": "p",
        "р": "r",
        "с": "s",
        "т": "t",
        "у": "u",
        "ф": "f",
        "х": "h",
        "ц": "ts",
        "ч": "ch",
        "ш": "sh",
        "щ": "sch",
        "ъ": "",
        "ы": "y",
        "ь": "",
        "э": "e",
        "ю": "yu",
        "я": "ya",
    }
)


def pipeline_slug_from_name(name: str) -> str:
    from django.utils.text import slugify

    normalized = name.strip().lower().translate(_RU_TO_LATIN)
    slug = slugify(normalized, allow_unicode=False)
    return slug or "pipeline"


def ensure_unique_pipeline_slug(company: Company, base_slug: str) -> str:
    slug = base_slug or "pipeline"
    candidate = slug
    suffix = 2
    while DealPipeline.objects.filter(company=company, slug=candidate).exists():
        candidate = f"{slug}-{suffix}"
        suffix += 1
    return candidate


def seed_default_stages_for_pipeline(pipeline: DealPipeline) -> None:
    if pipeline.stages.exists():
        return
    for stage_data in DEFAULT_FITNESS_STAGES:
        DealStage.objects.create(pipeline=pipeline, **stage_data)


def stage_code_from_name(name: str) -> str:
    return pipeline_slug_from_name(name)


def ensure_unique_stage_code(pipeline: DealPipeline, base_slug: str) -> str:
    slug = base_slug or "stage"
    candidate = slug
    suffix = 2
    while DealStage.objects.filter(pipeline=pipeline, code=candidate).exists():
        candidate = f"{slug}-{suffix}"
        suffix += 1
    return candidate


def compute_stage_sort_order(pipeline: DealPipeline, after_stage_id: int | None = None) -> int:
    stages = list(pipeline.stages.order_by("sort_order", "id"))

    if after_stage_id:
        after_index = next((index for index, stage in enumerate(stages) if stage.id == after_stage_id), None)
        if after_index is not None:
            after_stage = stages[after_index]
            next_stage = stages[after_index + 1] if after_index + 1 < len(stages) else None
            if next_stage:
                gap = next_stage.sort_order - after_stage.sort_order
                if gap > 1:
                    return after_stage.sort_order + gap // 2
            return after_stage.sort_order + 10

    terminal_stages = [stage for stage in stages if stage.is_won or stage.is_lost]
    if terminal_stages:
        min_terminal_order = min(stage.sort_order for stage in terminal_stages)
        if min_terminal_order > 10:
            return min_terminal_order - 5
        return max(min_terminal_order - 1, 1)

    if stages:
        return max(stage.sort_order for stage in stages) + 10

    return 10


def reorder_pipeline_stages(pipeline: DealPipeline, stage_ids: list[int]) -> None:
    stages_by_id = {stage.id: stage for stage in pipeline.stages.all()}
    if set(stage_ids) != set(stages_by_id.keys()):
        raise ValueError("Список этапов не совпадает с воронкой.")

    updates: list[DealStage] = []
    for index, stage_id in enumerate(stage_ids):
        stage = stages_by_id[stage_id]
        stage.sort_order = (index + 1) * 10
        updates.append(stage)

    DealStage.objects.bulk_update(updates, ["sort_order", "updated_at"])
