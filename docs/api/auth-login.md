# API: авторизация

## Назначение

Выдаёт token для frontend и возвращает tenant-контекст пользователя через `CompanyMembership`.

## URL

```text
POST /api/v1/auth/login/
GET /api/v1/auth/me/
POST /api/v1/auth/logout/
```

## Пример login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<demo-password>"}'
```

## Пример ответа

```json
{
  "token": "abc123",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@sportmax.local",
    "display_name": "Пётр Менеджеров",
    "initials": "ПМ"
  },
  "memberships": [
    {
      "id": 1,
      "company_name": "Sportmax Fitness",
      "company_slug": "sportmax",
      "branch_name": "Main Hall",
      "role": "admin",
      "is_active": true
    }
  ],
  "company": {
    "id": 1,
    "name": "Sportmax Fitness",
    "slug": "sportmax",
    "role": "admin",
    "branch_name": "Main Hall",
    "clients_count": 5
  }
}
```

## Авторизованные запросы

```bash
curl http://localhost:8000/api/v1/clients/?company=sportmax \
  -H "Authorization: Token abc123"
```

## Demo-пользователь

После `seed_demo`:

- login: `admin`
- password: `<demo-password>`

## Тест

`backend/accounts/tests/test_api.py`
