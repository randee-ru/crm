# Этап 2 - Основа backend

## Цель

Сделать запуск Django backend предсказуемым и задокументированным.

## Что добавляет этот этап

- настройки Django, разделённые по окружениям
- файлы `.env.example`
- PostgreSQL и Redis через Docker Compose
- `Dockerfile` для backend
- модуль настроек для тестов
- healthcheck endpoint
- API-документация с примерами и тестом
- локальные настройки как цель запуска по умолчанию

## Зачем нужен этот этап

Этот этап превращает репозиторий из структуры в запускаемую основу backend.
Без него следующая функциональность строилась бы на догадках.

## Самые важные файлы

- `Dockerfile`
- `docker-compose.yml`
- `backend/manage.py`
- `backend/config/settings/base.py`
- `backend/config/settings/dev.py`
- `backend/config/settings/local.py`
- `backend/config/settings/prod.py`
- `backend/config/settings/test.py`
- `backend/core/tests/test_healthcheck.py`
- `docs/api/healthcheck.md`

## Как проверить

1. скопировать `.env.example` в `.env`
2. запустить `docker compose up --build`
3. открыть `http://localhost:8000/health/`

## Урок для новичка

Backend bootstrap - это процесс, при котором backend начинает запускаться чисто и предсказуемо ещё до появления бизнес-логики.
Это значит, что настройки, зависимости, контейнеры и healthcheck идут раньше, чем фичи.
