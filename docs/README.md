# Документация CRM Kit

Полный указатель по проекту. Начните с [обзора](./overview.md) или [handoff.md](../handoff.md) для быстрого входа.

---

## Быстрый старт

| Задача | Куда идти |
|--------|-----------|
| Запустить проект локально | [Урок 06](./lessons/06-how-to-run-local-project.md) |
| Понять архитектуру | [overview.md](./overview.md), [platform-admin-vs-crm](./architecture/platform-admin-vs-crm.md) |
| Добавить новую фичу | [Урок 13](./lessons/13-how-to-develop-full-feature.md) → [Чеклист](./lessons/18-developer-checklist.md) |
| Продолжить в другой сессии | [handoff.md](../handoff.md) |
| Roadmap продукта | [roadmap.md](./roadmap.md) |

**Демо-логин** (после `seed_demo`): `admin` / `121351`, компания `sportmax`.

---

## Структура репозитория

```
CRM KIT/
├── backend/          Django, API, модели, тесты
├── frontend/         Next.js, dashboard, CRM UI
├── docs/             эта документация
├── handoff.md        краткий контекст для AI/нового разработчика
├── docker-compose.yml
└── README.md
```

---

## Этапы разработки (stages)

Хронология крупных вех:

| № | Файл | Содержание |
|---|------|------------|
| 01 | [stages/01-foundation.md](./stages/01-foundation.md) | Основа репозитория |
| 02 | [stages/02-backend-bootstrap.md](./stages/02-backend-bootstrap.md) | Django, Docker, healthcheck |
| 03 | [stages/03-saas-core.md](./stages/03-saas-core.md) | Company, Branch, multi-tenant |
| 04 | [stages/04-admin-unfold.md](./stages/04-admin-unfold.md) | Панель платформы на Unfold |
| 05 | [stages/05-fitness-club-mvp.md](./stages/05-fitness-club-mvp.md) | Клиенты, абонементы |
| 06 | [stages/06-frontend-bootstrap.md](./stages/06-frontend-bootstrap.md) | Next.js dashboard |
| 07 | [stages/07-developing-new-features.md](./stages/07-developing-new-features.md) | Учебный контур разработки |
| 08 | [stages/08-fitness-kanban-pipelines.md](./stages/08-fitness-kanban-pipelines.md) | **Канбан, воронки, сделки** |
| 09 | [stages/09-reports-analytics.md](./stages/09-reports-analytics.md) | Отчёты и аналитика |
| 10 | [stages/10-integrations.md](./stages/10-integrations.md) | Интеграции |
| 11 | [stages/11-production-hardening.md](./stages/11-production-hardening.md) | Production hardening |

---

## Уроки для разработчиков

Папка [lessons/](./lessons/) — пошаговые объяснения «как устроено» и «как делать самому».

### Блок 1 — Основа (01–06)

Запуск, Django, env, PostgreSQL, Docker.

### Блок 2 — SaaS и домен (07–10)

Компания, роли, admin, клиенты.

### Блок 3 — Frontend (11–12)

Next.js, API-клиент.

### Блок 4 — Разработка фич (13–21) ⭐

| № | Тема |
|---|------|
| 13 | [Карта: модель → API → UI](./lessons/13-how-to-develop-full-feature.md) |
| 14–17 | Модель, API, тесты, экран — пошагово |
| 18 | [Чеклист разработчика](./lessons/18-developer-checklist.md) |
| 19 | [Практика: CRUD абонементов](./lessons/19-practice-memberships-crud.md) |
| 20 | [Пример: профиль пользователя](./lessons/20-real-example-user-profile.md) |
| 21 | [**Пример: канбан и воронки фитнес-клуба**](./lessons/21-real-example-fitness-kanban-pipelines.md) |

**Рекомендуемый путь:** 06 → 13 → 14–17 → 20 → **21** → 19.

Полный индекс: [lessons/README.md](./lessons/README.md).

---

## API-документация

Папка [api/](./api/). Каждый endpoint: URL, примеры, тесты.

| Документ | Endpoints |
|----------|-----------|
| [healthcheck](./api/healthcheck.md) | `GET /health/` |
| [auth-login](./api/auth-login.md) | `POST /api/v1/auth/login/`, `/me/` |
| [clients-list](./api/clients-list.md) | `GET /api/v1/clients/` |
| [clients-crud](./api/clients-crud.md) | CRUD клиентов |
| [tasks-and-schedule](./api/tasks-and-schedule.md) | задачи, расписание |
| [**deals-and-pipelines**](./api/deals-and-pipelines.md) | **воронки, этапы, сделки** |
| [template](./api/template.md) | шаблон для новых страниц |

Индекс: [api/README.md](./api/README.md).

---

## Архитектура

| Документ | О чём |
|----------|-------|
| [overview.md](./overview.md) | Продукт и принципы |
| [platform-admin-vs-crm.md](./architecture/platform-admin-vs-crm.md) | Admin ≠ рабочий CRM |
| [crm-module.md](./architecture/crm-module.md) | Задачи, сделки, воронки |

---

## Админка

| Документ | О чём |
|----------|-------|
| [admin/README.md](./admin/README.md) | Обзор |
| [admin/unfold.md](./admin/unfold.md) | Unfold, тема, навигация |

---

## Backend-модули (кратко)

| Модуль | Назначение | Статус |
|--------|------------|--------|
| `core` | Базовые классы, healthcheck | ✅ |
| `accounts` | Пользователи, membership, auth | ✅ |
| `companies` | Tenant — компания | ✅ |
| `branches` | Филиалы | ✅ |
| `clients` | Клиенты клуба | ✅ |
| `crm` | Задачи, сделки, воронки | ✅ |
| `schedule` | Расписание занятий | ✅ |
| `memberships` | Абонементы (модель) | частично |
| `sales`, `payments` | Счета, оплаты | рабочие |
| `automation`, `notifications` | Роботы, уведомления | рабочий каркас |
| `reports` | Отчёты и аналитика | рабочий каркас |
| `integrations` | Внешние интеграции | рабочий каркас |

---

## Frontend-экраны

| Путь | Модуль |
|------|--------|
| `/` | Лендинг |
| `/login` | Авторизация |
| `/dashboard` | CRM: канбан сделок / список клиентов |
| `/dashboard/clients/*` | CRUD клиентов |
| `/dashboard/tasks/*` | Задачи |
| `/dashboard/schedule` | Расписание |
| `/dashboard/profile` | Профиль пользователя |
| `/dashboard/reports` | Отчёты и аналитика |
| `/dashboard/settings` | Настройки (инструменты, воронки) |

Подробнее: [frontend/README.md](../frontend/README.md).

---

## Локальный запуск (шпаргалка)

```bash
# PostgreSQL
docker compose up -d postgres

# Backend
cd backend
../.venv/bin/python manage.py migrate --settings=config.settings.dev
../.venv/bin/python manage.py seed_demo --settings=config.settings.dev
../.venv/bin/python manage.py runserver 127.0.0.1:8000 --settings=config.settings.dev

# Frontend
cd frontend
npm run dev
```

- Backend: http://127.0.0.1:8000
- Frontend: http://localhost:3000
- Admin: http://127.0.0.1:8000/admin/

---

## Как обновлять документацию

При каждой значимой фиче:

1. Добавить или обновить страницу в `docs/api/` (если есть HTTP API).
2. Добавить урок или раздел в `docs/lessons/` (если учебная ценность).
3. Обновить `docs/stages/` при завершении этапа.
4. Обновить `handoff.md` — краткое состояние для следующей сессии.
5. Обновить этот файл (`docs/README.md`), если появился новый раздел.

Шаблон API: [api/template.md](./api/template.md).
