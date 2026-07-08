# API: уведомления

Список уведомлений компании и управление состоянием прочтения.

## Endpoints

- `GET /api/v1/notifications/?company=<slug>`
- `GET /api/v1/notifications/?company=<slug>&unread=true`
- `POST /api/v1/notifications/mark-all-read/?company=<slug>`
- `GET /api/v1/notifications/<id>/?company=<slug>`
- `PATCH /api/v1/notifications/<id>/?company=<slug>`

## Что возвращает список

- `kind`
- `title`
- `body`
- `target_url`
- `is_read`
- `read_at`
- `created_at`

## Тест

- `backend/notifications/tests/test_api.py`
