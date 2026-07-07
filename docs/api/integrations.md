# Integrations API

Реестр внешних интеграций и журнал webhook-событий.

## Endpoints

- `GET /api/v1/integrations/?company=<slug>`
- `POST /api/v1/integrations/?company=<slug>`
- `GET /api/v1/integrations/<id>/?company=<slug>`
- `PATCH /api/v1/integrations/<id>/?company=<slug>`
- `DELETE /api/v1/integrations/<id>/?company=<slug>`
- `GET /api/v1/integrations/events/?company=<slug>`
- `POST /api/v1/integrations/webhooks/<provider>/?company=<slug>`

## Провайдеры

- `mango`
- `sigur`
- `rfid`
- `turnstile`
- `payment`
- `sms`
- `partner`

## Тест

- `backend/integrations/tests/test_api.py`
