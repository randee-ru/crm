# API: сделки, воронки и этапы канбана

Модуль CRM. Все запросы требуют:

- заголовок `Authorization: Token <token>`
- параметр `?company=<slug>` (или membership по умолчанию)

## Воронки (pipelines)

### Список воронок с этапами

```http
GET /api/v1/pipelines/?company=sportmax
```

Если у компании нет воронок — автоматически создаётся дефолтная «Продажи абонементов» с 7 этапами фитнес-клуба.

**Пример ответа:**

```json
[
  {
    "id": 1,
    "name": "Продажи абонементов",
    "slug": "membership-sales",
    "is_default": true,
    "is_active": true,
    "sort_order": 0,
    "stages": [
      {
        "id": 1,
        "name": "Новая заявка",
        "code": "new_lead",
        "color": "#3d5f8f",
        "sort_order": 10,
        "is_won": false,
        "is_lost": false,
        "deals_count": 1
      }
    ]
  }
]
```

### Создать воронку

```http
POST /api/v1/pipelines/?company=sportmax
Content-Type: application/json

{
  "name": "Корпоративные продажи",
  "slug": "corporate",
  "sort_order": 10,
  "is_default": false
}
```

### Обновить воронку

```http
PATCH /api/v1/pipelines/2/?company=sportmax

{"name": "B2B продажи", "is_default": true}
```

При `is_default: true` остальные воронки компании сбрасываются в `is_default: false`.

### Удалить (мягко)

```http
DELETE /api/v1/pipelines/2/?company=sportmax
```

Устанавливает `is_active: false`, данные не удаляются физически.

---

## Этапы воронки (stages)

### Список этапов

```http
GET /api/v1/pipelines/1/stages/?company=sportmax
```

### Создать этап

```http
POST /api/v1/pipelines/1/stages/?company=sportmax
Content-Type: application/json

{
  "name": "Первый контакт",
  "code": "first_contact",
  "color": "#336699",
  "sort_order": 5,
  "is_won": false,
  "is_lost": false
}
```

`code` уникален в рамках воронки.

### Обновить этап

```http
PATCH /api/v1/pipelines/1/stages/3/?company=sportmax

{"color": "#ff5500", "sort_order": 25}
```

### Удалить этап

```http
DELETE /api/v1/pipelines/1/stages/3/?company=sportmax
```

Ошибка `400`, если на этапе есть сделки.

---

## Сделки (deals)

### Список

```http
GET /api/v1/deals/?company=sportmax
GET /api/v1/deals/?company=sportmax&pipeline=1
GET /api/v1/deals/?company=sportmax&stage=3
GET /api/v1/deals/?company=sportmax&search=иван
```

**Пример элемента списка:**

```json
{
  "id": 5,
  "title": "Абонемент 3 месяца",
  "amount": "12900.00",
  "pipeline_id": 1,
  "stage_id": 2,
  "stage_code": "trial",
  "stage_label": "Пробное занятие",
  "stage_color": "#4a90d9",
  "client_name": "Иван Петров",
  "branch_name": "Main Hall",
  "assigned_to_name": "admin",
  "created_at": "2026-07-06T08:00:00Z"
}
```

### Создать сделку

```http
POST /api/v1/deals/?company=sportmax
Content-Type: application/json

{
  "title": "Семейный тариф",
  "amount": "24000",
  "pipeline_id": 1,
  "stage_id": 1,
  "client_id": 12
}
```

Если `pipeline_id` не указан — берётся воронка по умолчанию.
Если `stage_id` не указан — первый этап воронки по `sort_order`.

### Карточка сделки

```http
GET /api/v1/deals/5/?company=sportmax
```

Дополнительные поля: `client_id`, `branch_id`, `assigned_to_id`, `updated_at`.

### Обновить (переместить на канбане)

```http
PATCH /api/v1/deals/5/?company=sportmax

{"stage_id": 4}
```

Этап должен принадлежать той же воронке, что и сделка.

---

## Frontend

| Экран | URL |
|-------|-----|
| Канбан сделок | `/dashboard?view=kanban` |
| Канбан конкретной воронки | `/dashboard?view=kanban&pipeline=1` |
| Настройки воронок | `/dashboard/settings?section=pipelines` |

Компоненты: `crm-kanban-board.tsx`, `crm-funnel-select.tsx`.
Actions: `frontend/app/actions/deals.ts`.

---

## Demo data

`python manage.py seed_demo --settings=config.settings.dev` создаёт 5 сделок в разных этапах дефолтной воронки для компании `sportmax`.

---

## Тесты

```bash
cd backend
../.venv/bin/python manage.py test crm.tests.test_deal_api --settings=config.settings.dev
```

Покрыто:

- создание и список сделок
- PATCH `stage_id`
- автосоздание дефолтной воронки
- создание воронки и этапа

---

## Код

| Часть | Путь |
|-------|------|
| Модели | `backend/crm/models.py` |
| Дефолты фитнес-клуба | `backend/crm/pipelines.py` |
| Views воронок | `backend/crm/pipeline_views.py` |
| Views сделок | `backend/crm/deal_views.py` |
| URLs | `backend/crm/urls.py` |
