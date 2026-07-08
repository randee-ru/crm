# API: список клиентов

## Назначение

Возвращает список клиентов конкретной компании для CRM-интерфейса.
Endpoint используется dashboard и главной страницей frontend.

## URL

```text
GET /api/v1/clients/?company=sportmax&search=иван&membership_status=active
```

Требует заголовок:

```text
Authorization: Token <token>
```

## Пример запроса

```bash
curl "http://localhost:8000/api/v1/clients/?company=sportmax"
```

## Пример ответа

```json
[
  {
    "id": 1,
    "full_name": "Иван Петров",
    "first_name": "Иван",
    "last_name": "Петров",
    "phone": "+79991110001",
    "email": "ivan@sportmax.local",
    "is_active": true,
    "branch_name": "Main Hall",
    "membership_status": "active",
    "membership_title": "Пробный месяц",
    "created_at": "2026-07-05T12:00:00Z"
  }
]
```

## Tenant-контекст

```text
GET /api/v1/company/?company=sportmax
```

```json
{
  "id": 1,
  "name": "Sportmax Fitness",
  "slug": "sportmax",
  "clients_count": 5
}
```

## Тест

Проверка contract-like поведения находится в:

`backend/clients/tests/test_api.py`

## Локальные demo-данные

```bash
python backend/manage.py seed_demo --settings=config.settings.dev
```
