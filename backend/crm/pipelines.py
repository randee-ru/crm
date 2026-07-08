"""Сервис воронок продаж и продления для фитнес-клубов."""

from __future__ import annotations

from companies.models import Company
from crm.models import Deal, DealPipeline, DealStage

SALES_PIPELINE_NAME = "Продажа абонемента"
SALES_PIPELINE_SLUG = "membership-sales"

GENERAL_PIPELINE_NAME = "Общая воронка"
GENERAL_PIPELINE_SLUG = "general"

RENEWAL_PIPELINE_NAME = "Продление абонемента"
RENEWAL_PIPELINE_SLUG = "membership-renewal"

WINBACK_PIPELINE_NAME = "Возврат клиентов"
WINBACK_PIPELINE_SLUG = "customer-winback"

# Обратная совместимость
FITNESS_PIPELINE_NAME = GENERAL_PIPELINE_NAME
FITNESS_PIPELINE_SLUG = GENERAL_PIPELINE_SLUG

DEFAULT_SALES_STAGES: list[dict] = [
    {
        "name": "Новая заявка",
        "code": "new_lead",
        "color": "#3d5f8f",
        "sort_order": 10,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Назначен визит",
        "code": "visit_scheduled",
        "color": "#4a90d9",
        "sort_order": 20,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Визит состоялся",
        "code": "visit_done",
        "color": "#2eb8d4",
        "sort_order": 30,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Повторный контакт",
        "code": "follow_up",
        "color": "#3dba5c",
        "sort_order": 40,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Оформление договора",
        "code": "contract",
        "color": "#e8a020",
        "sort_order": 50,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Продано",
        "code": "won",
        "color": "#2fa34d",
        "sort_order": 60,
        "is_won": True,
        "is_lost": False,
    },
    {
        "name": "Потеряно",
        "code": "lost",
        "color": "#8b98a8",
        "sort_order": 70,
        "is_won": False,
        "is_lost": True,
    },
]

DEFAULT_RENEWAL_STAGES: list[dict] = [
    {
        "name": "До окончания 30 дней",
        "code": "renewal_30",
        "color": "#3d5f8f",
        "sort_order": 10,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "До окончания 15 дней",
        "code": "renewal_15",
        "color": "#4a90d9",
        "sort_order": 20,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "До окончания 7 дней",
        "code": "renewal_7",
        "color": "#2eb8d4",
        "sort_order": 30,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "До окончания 3 дня",
        "code": "renewal_3",
        "color": "#e8a020",
        "sort_order": 40,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Заканчивается сегодня",
        "code": "renewal_today",
        "color": "#e85d04",
        "sort_order": 50,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Просрочено",
        "code": "renewal_overdue",
        "color": "#d62828",
        "sort_order": 60,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Продлил",
        "code": "renewal_won",
        "color": "#2fa34d",
        "sort_order": 70,
        "is_won": True,
        "is_lost": False,
    },
    {
        "name": "Не продлил",
        "code": "renewal_lost",
        "color": "#8b98a8",
        "sort_order": 80,
        "is_won": False,
        "is_lost": True,
    },
]

DEFAULT_WINBACK_STAGES: list[dict] = [
    {
        "name": "Кандидат на возврат",
        "code": "winback_new",
        "color": "#3d5f8f",
        "sort_order": 10,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Связались",
        "code": "winback_contact",
        "color": "#4a90d9",
        "sort_order": 20,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Предложение",
        "code": "winback_offer",
        "color": "#e8a020",
        "sort_order": 30,
        "is_won": False,
        "is_lost": False,
    },
    {
        "name": "Вернулся",
        "code": "winback_won",
        "color": "#2fa34d",
        "sort_order": 40,
        "is_won": True,
        "is_lost": False,
    },
    {
        "name": "Не вернулся",
        "code": "winback_lost",
        "color": "#8b98a8",
        "sort_order": 50,
        "is_won": False,
        "is_lost": True,
    },
]

CANONICAL_PIPELINE_SLUGS = frozenset(
    {
        GENERAL_PIPELINE_SLUG,
        SALES_PIPELINE_SLUG,
        RENEWAL_PIPELINE_SLUG,
        WINBACK_PIPELINE_SLUG,
    }
)
LEGACY_PIPELINE_SLUGS = frozenset({"all", "overview"})
LEGACY_PIPELINE_NAMES = frozenset({"Все", "Продажи абонементов"})
SALES_STAGE_CODES = frozenset(stage["code"] for stage in DEFAULT_SALES_STAGES)
RENEWAL_STAGE_CODES = frozenset(stage["code"] for stage in DEFAULT_RENEWAL_STAGES)
WINBACK_STAGE_CODES = frozenset(stage["code"] for stage in DEFAULT_WINBACK_STAGES)

# Старые коды этапов → новые (миграция существующих сделок)
LEGACY_SALES_STAGE_MAP = {
    "new": "new_lead",
    "trial": "visit_scheduled",
    "trial_done": "visit_done",
    "offer": "follow_up",
    "payment": "contract",
    "preparation": "visit_scheduled",
    "prepayment": "contract",
    "in_progress": "follow_up",
    "final_invoice": "contract",
}

LEGACY_STAGE_MAP = LEGACY_SALES_STAGE_MAP

# Для обратной совместимости
DEFAULT_FITNESS_STAGES = DEFAULT_SALES_STAGES


def _upsert_stages(pipeline: DealPipeline, stages: list[dict]) -> None:
    for stage_data in stages:
        DealStage.objects.update_or_create(
            pipeline=pipeline,
            code=stage_data["code"],
            defaults=stage_data,
        )


def _migrate_deals_to_new_stage_codes(pipeline: DealPipeline, stage_map: dict[str, str]) -> None:
    """Переносит сделки со старых кодов этапов на новые."""
    for old_code, new_code in stage_map.items():
        if old_code == new_code:
            continue
        old_stage = pipeline.stages.filter(code=old_code).first()
        new_stage = pipeline.stages.filter(code=new_code).first()
        if old_stage and new_stage and old_stage.id != new_stage.id:
            Deal.objects.filter(pipeline=pipeline, stage=old_stage).update(stage=new_stage)


def _cleanup_legacy_sales_stages(pipeline: DealPipeline) -> None:
    """Удаляет пустые устаревшие колонки после миграции на новые этапы."""
    _migrate_deals_to_new_stage_codes(pipeline, LEGACY_SALES_STAGE_MAP)
    legacy_codes = set(LEGACY_SALES_STAGE_MAP.keys()) | {
        "new",
        "preparation",
        "prepayment",
        "in_progress",
        "final_invoice",
    }
    for stage in pipeline.stages.filter(code__in=legacy_codes):
        if not stage.deals.exists():
            stage.delete()


def _trim_non_canonical_stages(pipeline: DealPipeline, allowed_codes: frozenset[str]) -> None:
    """Оставляет только этапы из схемы воронки; пустые лишние колонки удаляет."""
    for stage in pipeline.stages.exclude(code__in=allowed_codes):
        if stage.deals.exists():
            fallback = pipeline.stages.filter(code="lost").first() or pipeline.stages.filter(
                code="new_lead"
            ).first()
            if fallback:
                Deal.objects.filter(stage=stage).update(stage=fallback)
        stage.delete()


def _deactivate_legacy_pipelines(company: Company) -> None:
    """Скрывает устаревшую воронку «Все» и другие дубликаты."""
    DealPipeline.objects.filter(
        company=company,
        is_active=True,
        slug__in=LEGACY_PIPELINE_SLUGS,
    ).update(is_active=False)

    DealPipeline.objects.filter(
        company=company,
        is_active=True,
        name__in=LEGACY_PIPELINE_NAMES,
    ).exclude(slug__in=CANONICAL_PIPELINE_SLUGS).update(is_active=False)


def _distribute_new_leads_to_general(company: Company) -> None:
    """Новые заявки — в «Общую воронку», активные продажи — в «Продажа абонемента»."""
    sales = DealPipeline.objects.filter(company=company, slug=SALES_PIPELINE_SLUG).first()
    general = DealPipeline.objects.filter(company=company, slug=GENERAL_PIPELINE_SLUG).first()
    if not sales or not general:
        return

    sales_new = sales.stages.filter(code="new_lead").first()
    general_new = general.stages.filter(code="new_lead").first()
    if sales_new and general_new:
        Deal.objects.filter(pipeline=sales, stage=sales_new).update(
            pipeline=general,
            stage=general_new,
        )


def normalize_company_pipelines(company: Company) -> None:
    """Четыре воронки по схеме фитнес-клуба + распределение заявок."""
    ensure_general_pipeline(company)
    ensure_sales_pipeline(company)
    ensure_renewal_pipeline(company)
    ensure_winback_pipeline(company)

    general = DealPipeline.objects.get(company=company, slug=GENERAL_PIPELINE_SLUG)
    sales = DealPipeline.objects.get(company=company, slug=SALES_PIPELINE_SLUG)
    renewal = DealPipeline.objects.get(company=company, slug=RENEWAL_PIPELINE_SLUG)
    winback = DealPipeline.objects.get(company=company, slug=WINBACK_PIPELINE_SLUG)

    _trim_non_canonical_stages(general, SALES_STAGE_CODES)
    _trim_non_canonical_stages(sales, SALES_STAGE_CODES)
    _trim_non_canonical_stages(renewal, RENEWAL_STAGE_CODES)
    _trim_non_canonical_stages(winback, WINBACK_STAGE_CODES)
    _deactivate_legacy_pipelines(company)
    _distribute_new_leads_to_general(company)


def ensure_general_pipeline(company: Company) -> DealPipeline:
    pipeline, created = DealPipeline.objects.get_or_create(
        company=company,
        slug=GENERAL_PIPELINE_SLUG,
        defaults={
            "name": GENERAL_PIPELINE_NAME,
            "is_default": True,
            "is_active": True,
            "sort_order": 0,
        },
    )

    if created or not pipeline.stages.exists():
        _upsert_stages(pipeline, DEFAULT_SALES_STAGES)
    else:
        _upsert_stages(pipeline, DEFAULT_SALES_STAGES)
        _cleanup_legacy_sales_stages(pipeline)

    if pipeline.name != GENERAL_PIPELINE_NAME:
        pipeline.name = GENERAL_PIPELINE_NAME
        pipeline.save(update_fields=["name", "updated_at"])

    DealPipeline.objects.filter(company=company, is_default=True).exclude(id=pipeline.id).update(
        is_default=False
    )
    if not pipeline.is_default:
        pipeline.is_default = True
        pipeline.save(update_fields=["is_default", "updated_at"])

    return pipeline


def ensure_sales_pipeline(company: Company) -> DealPipeline:
    pipeline, created = DealPipeline.objects.get_or_create(
        company=company,
        slug=SALES_PIPELINE_SLUG,
        defaults={
            "name": SALES_PIPELINE_NAME,
            "is_default": False,
            "is_active": True,
            "sort_order": 10,
        },
    )

    if created or not pipeline.stages.exists():
        _upsert_stages(pipeline, DEFAULT_SALES_STAGES)
    else:
        _upsert_stages(pipeline, DEFAULT_SALES_STAGES)
        _cleanup_legacy_sales_stages(pipeline)

    if pipeline.name != SALES_PIPELINE_NAME:
        pipeline.name = SALES_PIPELINE_NAME
        pipeline.save(update_fields=["name", "updated_at"])

    updates: list[str] = []
    if pipeline.is_default:
        pipeline.is_default = False
        updates.append("is_default")
    if pipeline.sort_order != 10:
        pipeline.sort_order = 10
        updates.append("sort_order")
    if updates:
        updates.append("updated_at")
        pipeline.save(update_fields=updates)

    return pipeline


def ensure_renewal_pipeline(company: Company) -> DealPipeline:
    pipeline, created = DealPipeline.objects.get_or_create(
        company=company,
        slug=RENEWAL_PIPELINE_SLUG,
        defaults={
            "name": RENEWAL_PIPELINE_NAME,
            "is_default": False,
            "is_active": True,
            "sort_order": 20,
        },
    )

    if created or not pipeline.stages.exists():
        _upsert_stages(pipeline, DEFAULT_RENEWAL_STAGES)
    else:
        _upsert_stages(pipeline, DEFAULT_RENEWAL_STAGES)

    if pipeline.name != RENEWAL_PIPELINE_NAME:
        pipeline.name = RENEWAL_PIPELINE_NAME
        pipeline.save(update_fields=["name", "updated_at"])

    return pipeline


def ensure_winback_pipeline(company: Company) -> DealPipeline:
    pipeline, created = DealPipeline.objects.get_or_create(
        company=company,
        slug=WINBACK_PIPELINE_SLUG,
        defaults={
            "name": WINBACK_PIPELINE_NAME,
            "is_default": False,
            "is_active": True,
            "sort_order": 30,
        },
    )

    if created or not pipeline.stages.exists():
        _upsert_stages(pipeline, DEFAULT_WINBACK_STAGES)
    else:
        _upsert_stages(pipeline, DEFAULT_WINBACK_STAGES)

    if pipeline.name != WINBACK_PIPELINE_NAME:
        pipeline.name = WINBACK_PIPELINE_NAME
        pipeline.save(update_fields=["name", "updated_at"])

    return pipeline


def ensure_default_pipeline(company: Company) -> DealPipeline:
    """Создаёт 4 воронки и возвращает «Общую воронку» по умолчанию."""
    normalize_company_pipelines(company)
    return ensure_general_pipeline(company)


def get_general_pipeline(company: Company) -> DealPipeline:
    pipeline = (
        DealPipeline.objects.filter(company=company, is_active=True, slug=GENERAL_PIPELINE_SLUG)
        .prefetch_related("stages")
        .first()
    )
    if pipeline:
        return pipeline
    return ensure_general_pipeline(company)


def get_sales_pipeline(company: Company) -> DealPipeline:
    pipeline = (
        DealPipeline.objects.filter(company=company, is_active=True, slug=SALES_PIPELINE_SLUG)
        .prefetch_related("stages")
        .first()
    )
    if pipeline:
        return pipeline
    return ensure_sales_pipeline(company)


def get_default_pipeline(company: Company) -> DealPipeline:
    pipeline = (
        DealPipeline.objects.filter(company=company, is_active=True, is_default=True)
        .prefetch_related("stages")
        .first()
    )
    if pipeline:
        return pipeline
    return ensure_default_pipeline(company)


def get_renewal_pipeline(company: Company) -> DealPipeline:
    pipeline = (
        DealPipeline.objects.filter(company=company, is_active=True, slug=RENEWAL_PIPELINE_SLUG)
        .prefetch_related("stages")
        .first()
    )
    if pipeline:
        return pipeline
    return ensure_renewal_pipeline(company)


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
    if pipeline.slug == RENEWAL_PIPELINE_SLUG:
        stages = DEFAULT_RENEWAL_STAGES
    elif pipeline.slug == WINBACK_PIPELINE_SLUG:
        stages = DEFAULT_WINBACK_STAGES
    else:
        stages = DEFAULT_SALES_STAGES
    for stage_data in stages:
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


def renewal_stage_code_for_days(days_left: int) -> str:
    """Определяет код этапа продления по оставшимся дням."""
    if days_left > 15:
        return "renewal_30"
    if days_left > 7:
        return "renewal_15"
    if days_left > 3:
        return "renewal_7"
    if days_left > 0:
        return "renewal_3"
    if days_left == 0:
        return "renewal_today"
    return "renewal_overdue"
