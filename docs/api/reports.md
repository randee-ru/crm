# API: отчёты и аналитика

Отдельный модуль отчётов и аналитики.

## Endpoints

- `GET /api/v1/reports/daily/?company=<slug>&date=YYYY-MM-DD`
- `GET /api/v1/reports/overview/?company=<slug>&days=7`

## Daily report

Возвращает:
- звонки
- мессенджеры
- заявки сайта
- гостевые визиты
- продажи
- платежи

## Analytics overview

Возвращает:
- totals
- series
- top_sources

## Тест

- `backend/reports/tests/test_api.py`
