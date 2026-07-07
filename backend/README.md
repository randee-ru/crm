# Backend

Backend CRM Kit на Django — модульный монолит с REST API.

## Что уже есть

| Модуль | API | Описание |
|--------|-----|----------|
| `core` | `GET /health/` | healthcheck |
| `accounts` | `/api/v1/auth/` | login, `/me/`, membership |
| `companies` | `/api/v1/company/` | контекст tenant |
| `clients` | `/api/v1/clients/` | CRUD клиентов |
| `crm` | `/api/v1/tasks/`, `/deals/`, `/pipelines/` | задачи, сделки, воронки |
| `schedule` | `/api/v1/schedule/` | расписание |

## CRM: воронки и сделки

```
GET  /api/v1/pipelines/?company=sportmax
POST /api/v1/pipelines/<id>/stages/
GET  /api/v1/deals/?company=sportmax&pipeline=1
PATCH /api/v1/deals/<id>/  →  {"stage_id": 3}
```

Документация: [`docs/api/deals-and-pipelines.md`](../docs/api/deals-and-pipelines.md)

Код: `crm/models.py`, `crm/pipelines.py`, `crm/pipeline_views.py`, `crm/deal_views.py`

## Локальный запуск

```bash
docker compose up -d postgres

cd backend
../.venv/bin/python manage.py migrate --settings=config.settings.dev
../.venv/bin/python manage.py seed_demo --settings=config.settings.dev
../.venv/bin/python manage.py runserver 127.0.0.1:8000 --settings=config.settings.dev
```

Demo login: `admin` / `121351`

## Тесты

```bash
../.venv/bin/python manage.py test --settings=config.settings.dev
# или модуль:
../.venv/bin/python manage.py test crm.tests.test_deal_api --settings=config.settings.dev
```

## Структура каталога

```
backend/
├── config/           settings, urls, admin
├── core/             базовые модели, seed_demo
├── accounts/         auth, membership
├── companies/        tenant
├── branches/
├── clients/
├── crm/              задачи, сделки, воронки
├── schedule/
└── manage.py
```

## Правила

- Бизнес-логика — в моделях и сервисах (`pipelines.py`), не в settings
- Все tenant-данные фильтруются по `company`
- Операционный CRM — через API; `/admin/` — панель платформы

Подробнее: [`docs/README.md`](../docs/README.md)
