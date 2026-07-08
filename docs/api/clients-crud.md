# API: CRUD клиентов

## Назначение

Полный контур работы с клиентами компании из CRM-интерфейса.

## URL

```text
GET    /api/v1/clients/?company=sportmax
POST   /api/v1/clients/?company=sportmax
GET    /api/v1/clients/12/?company=sportmax
PATCH  /api/v1/clients/12/?company=sportmax
GET    /api/v1/branches/?company=sportmax
```

Все запросы требуют:

```text
Authorization: Token <token>
```

## Создание клиента

```bash
curl -X POST "http://localhost:8000/api/v1/clients/?company=sportmax" \
  -H "Authorization: Token <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Елена",
    "last_name": "Климова",
    "phone": "+79993334455",
    "email": "elena@example.com",
    "branch_id": 1,
    "notes": "Пробное занятие",
    "is_active": true
  }'
```

## Обновление клиента

```bash
curl -X PATCH "http://localhost:8000/api/v1/clients/12/?company=sportmax" \
  -H "Authorization: Token <token>" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Нужен повторный звонок"}'
```

## Frontend

- `/dashboard/clients/new` — создание
- `/dashboard/clients/[id]` — просмотр и редактирование
- switcher компании в header для `sportmax` / `fitpro`

## Тест

`backend/clients/tests/test_api.py`
