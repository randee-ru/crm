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
- `POST /api/v1/integrations/sigur/inbound/events/?company=<slug>` — приём проходов от локального прокси (заголовок `X-Sigur-Proxy-Key`)

## Sigur (облако + прокси на сервере клуба)

1. В CRM создайте интеграцию `sigur` — в `config.proxy_inbound_key` появится ключ.
2. На сервере клуба запустите `scripts/sigur-proxy/proxy.py` (см. `config.example.env`).
3. В Sigur укажите URL прокси: `http://127.0.0.1:9000/sigur/getaccess` и `.../events`.
4. Прокси пересылает в 1С локально и дублирует `events` в облако CRM.


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
