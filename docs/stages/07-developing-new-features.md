# Этап 7 — Разработка новых функций (учебный контур)

## Цель

Дать команде и новичкам **повторяемый процесс**: от модели до экрана, без догадок и «магии».

## Что добавлено

Серия уроков в `docs/lessons/`:

| № | Файл | О чём |
|---|------|-------|
| 13 | `13-how-to-develop-full-feature.md` | Карта: все слои от модели до UI |
| 14 | `14-new-django-model-step-by-step.md` | Новая модель, миграция, admin |
| 15 | `15-new-api-crud-step-by-step.md` | Сериализаторы, views, urls |
| 16 | `16-backend-tests-step-by-step.md` | Тесты модели и API |
| 17 | `17-new-frontend-screen-step-by-step.md` | Типы, API, actions, страницы |
| 18 | `18-developer-checklist.md` | Чеклист на каждую задачу |
| 19 | `19-practice-memberships-crud.md` | Практическое задание |
| 20 | `20-real-example-user-profile.md` | Разбор профиля с фото |
| 21 | `21-real-example-fitness-kanban-pipelines.md` | Канбан, воронки, этапы из БД |

## Эталонные модули

- **Клиенты** (`backend/clients/` + `frontend/.../clients/`) — CRUD
- **CRM Kanban** (`backend/crm/` + `frontend/components/crm-kanban-board.tsx`) — воронки

## Рекомендуемый порядок обучения

1. Уроки 01–12 (основа проекта)
2. Урок 13 (карта)
3. Уроки 14–17 (по шагам)
4. Урок 20 (профиль) и **Урок 21 (канбан)**
5. Урок 19 (самостоятельная практика)

## Критерии готовности команды

- Может добавить модель с tenant-привязкой к `Company`
- Может открыть CRUD API с `HasCompanyAccess`
- Может сделать список + форму на frontend
- Понимает миграцию данных при смене схемы (урок 21)
- Пишет тесты до merge
- Знает чеклист и не пропускает слои

## Следующий продуктовый шаг

- Inline-редактор воронок в settings
- Практика [CRUD абонементов](../lessons/19-practice-memberships-crud.md)
