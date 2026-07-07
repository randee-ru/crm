# Архитектура CRM-модуля

Модуль `crm` отвечает за операционную работу менеджеров: задачи, сделки, канбан продаж.

## Границы модуля

| Входит | Не входит (пока) |
|--------|------------------|
| Задачи (`Task`) | Счета и оплаты (`sales`, `payments`) |
| Сделки (`Deal`) | Маркетинговые рассылки |
| Воронки (`DealPipeline`, `DealStage`) | Автоматические роботы смены этапа |
| Канбан API + UI | Полноценный inline-редактор воронок в settings |

## Структура backend

```
backend/crm/
├── models.py              # Task, Deal, DealPipeline, DealStage
├── pipelines.py           # дефолтная воронка фитнес-клуба
├── serializers.py         # задачи
├── views.py               # задачи
├── deal_serializers.py    # сделки
├── deal_views.py          # сделки
├── pipeline_serializers.py
├── pipeline_views.py
├── urls.py
├── admin.py
└── tests/
    ├── test_api.py        # задачи
    └── test_deal_api.py   # сделки и воронки
```

## Модель данных сделок

```
Company
  └── DealPipeline (воронка)
        ├── DealStage (этап / колонка)
        └── Deal (сделка)
              ├── Client (опционально)
              ├── Branch (опционально)
              └── User assigned_to
```

### Инварианты

1. `deal.company_id == pipeline.company_id`
2. `deal.stage.pipeline_id == deal.pipeline_id`
3. `deal.client.company_id == deal.company_id` (если клиент указан)
4. Удаление этапа запрещено (`PROTECT`), если есть сделки

## Tenant-изоляция

Все queryset'ы фильтруются по `company__slug` из query-параметра `?company=` через `HasCompanyAccess` и `resolve_company_slug`.

Пользователь без membership в компании получает 403.

## Дефолтная воронка

При первом обращении к pipelines для компании вызывается `ensure_default_pipeline(company)`:

- воронка `membership-sales` / «Продажи абонементов»
- 7 этапов под сценарий фитнес-клуба (см. `DEFAULT_FITNESS_STAGES` в `pipelines.py`)

Это позволяет новому tenant'у сразу видеть рабочий канбан.

## Frontend

```
frontend/
├── app/dashboard/page.tsx           # канбан / список клиентов
├── app/actions/deals.ts             # PATCH stage, POST quick deal
├── components/crm-kanban-board.tsx  # drag-and-drop
├── components/crm-funnel-select.tsx # выбор воронки
├── components/crm-module-header.tsx # шапка CRM-модуля
└── lib/
    ├── api.ts                       # getPipelines, getDeals
    └── types.ts                     # DealPipelineRecord, DealStageRecord
```

Канбан — **client component** (drag-and-drop). Данные загружаются на server component страницы и передаются props.

## Admin

Операционные модели CRM **не показываются** в `/admin/` по умолчанию (см. `docs/architecture/platform-admin-vs-crm.md`).

При `ADMIN_ENABLE_BUSINESS_MODELS=True` в dev доступны `DealPipeline`, `DealStage`, `Deal`, `Task`.

## Связь с другими модулями

| Модуль | Связь |
|--------|-------|
| `clients` | FK `Deal.client` |
| `branches` | FK `Deal.branch` |
| `accounts` | FK `Deal.assigned_to`, permissions |
| `companies` | FK `Deal.company`, `DealPipeline.company` |

## Планируемое развитие

- История смены этапов (`DealStageHistory`)
- Триггеры automation при `is_won` / `is_lost`
- Конверсия и отчёты по воронке
- Привязка сделки к абонементу после оплаты
