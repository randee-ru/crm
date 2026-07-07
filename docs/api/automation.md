# Automation API

Каркас бизнес-автоматизации: правила, события и обработка очереди.

## Endpoints

- `GET /api/v1/automation/rules/?company=<slug>`
- `POST /api/v1/automation/rules/?company=<slug>`
- `GET /api/v1/automation/rules/<id>/?company=<slug>`
- `PATCH /api/v1/automation/rules/<id>/?company=<slug>`
- `DELETE /api/v1/automation/rules/<id>/?company=<slug>`
- `GET /api/v1/automation/events/?company=<slug>`

## Модель правила

- `event_type`
- `conditions`
- `actions`
- `is_active`

## Тест

- `backend/automation/tests/test_api.py`
