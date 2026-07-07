# API: tasks and schedule

## Tasks

```text
GET    /api/v1/tasks/?company=sportmax&status=open&due=today
POST   /api/v1/tasks/?company=sportmax
GET    /api/v1/tasks/12/?company=sportmax
PATCH  /api/v1/tasks/12/?company=sportmax
```

## Schedule

```text
GET /api/v1/schedule/?company=sportmax&when=today
POST /api/v1/schedule/?company=sportmax
```

## Frontend

- `/dashboard/tasks`
- `/dashboard/tasks/new`
- `/dashboard/tasks/[id]`
- `/dashboard/schedule`

## Demo data

`seed_demo` создаёт 3 задачи и 2 события расписания на каждую компанию.

## Tests

- `backend/crm/tests/test_api.py`
- `backend/schedule/tests/test_api.py`
