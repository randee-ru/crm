# CRM Kit

CRM Kit — модульная SaaS CRM/ERP-платформа для сервисного бизнеса. Первая вертикаль — **фитнес-клубы**.

## Что в репозитории

| Каталог | Содержание |
|---------|------------|
| `backend/` | Django API, модели, тесты, `seed_demo` |
| `frontend/` | Next.js — dashboard, CRM UI, настройки |
| `docs/` | Документация, уроки, API-справка |
| `handoff.md` | Краткий контекст для продолжения работы |

## Текущее состояние

- Multi-tenant: компании, филиалы, роли, token-auth
- Клиенты: CRUD, поиск, фильтры
- CRM: задачи, **канбан сделок с воронками из PostgreSQL**
- Расписание: API и экран
- Frontend: Bitrix24-style shell, профиль, настройки
- Документация: уроки 01–21, API, этапы 01–08

## Локальный запуск

```bash
docker compose up -d postgres

cd backend
../.venv/bin/python manage.py migrate --settings=config.settings.dev
../.venv/bin/python manage.py seed_demo --settings=config.settings.dev
../.venv/bin/python manage.py runserver 127.0.0.1:8000 --settings=config.settings.dev

cd frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://127.0.0.1:8000
- Логин: `admin` / `<demo-password>` (после `seed_demo`)

## Документация

**Полный указатель:** [`docs/README.md`](docs/README.md)

| Документ | Описание |
|----------|----------|
| [`docs/overview.md`](docs/overview.md) | Обзор продукта |
| [`docs/roadmap.md`](docs/roadmap.md) | Дорожная карта |
| [`docs/lessons/`](docs/lessons/) | Уроки для разработчиков |
| [`docs/api/`](docs/api/) | Справка по HTTP API |
| [`docs/stages/`](docs/stages/) | Этапы разработки |
| [`handoff.md`](handoff.md) | Контекст для AI / новой сессии |

**Новый разработчик:** начните с [Урока 06](docs/lessons/06-how-to-run-local-project.md) и [Урока 13](docs/lessons/13-how-to-develop-full-feature.md).

**Канбан CRM:** [Урок 21](docs/lessons/21-real-example-fitness-kanban-pipelines.md).

## Стек

- Python 3.13+, Django 5.x, DRF, PostgreSQL 17
- Next.js, TypeScript, Tailwind CSS
- Docker Compose (PostgreSQL)
- django-unfold (admin платформы)
