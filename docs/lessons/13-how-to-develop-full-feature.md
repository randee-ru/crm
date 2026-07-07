# Урок 13 — Как разрабатывать новую функцию от нуля до экрана

## Простое объяснение

Каждая новая возможность в CRM Kit — это **цепочка слоёв**:

```
Модель → Миграция → API → Тесты → Типы → Страница → Форма
```

Если пропустить слой, функция «наполовину работает»: данные есть в базе, но нет кнопки в UI, или наоборот — форма есть, а backend падает.

## Эталон в проекте

Эталоны в проекте:

| Модуль | Где смотреть |
|--------|----------------|
| Клиенты | `backend/clients/`, `frontend/app/dashboard/clients/` |
| Канбан CRM | `backend/crm/`, `frontend/components/crm-kanban-board.tsx` |

Перед любой новой задачей откройте эти файлы и копируйте **структуру**, не текст дословно.

Живые разборы: [Урок 20](./20-real-example-user-profile.md), [Урок 21](./21-real-example-fitness-kanban-pipelines.md).

## Порядок работы (всегда один и тот же)

### Шаг 1. Backend — данные

1. Решите, в каком **модуле** живёт сущность (`clients`, `schedule`, `memberships`…).
2. Опишите **модель** с привязкой к `company` (и при необходимости `branch`).
3. Сделайте **миграцию** и примените её.
4. Добавьте **admin** (для отладки в dev).

→ Подробно: [Урок 14 — Новая модель Django](./14-new-django-model-step-by-step.md)

### Шаг 2. Backend — API

1. **List serializer** — для таблиц и списков.
2. **Detail serializer** — для карточки.
3. **Write serializer** — для создания и редактирования.
4. **Views** с `HasCompanyAccess` и фильтром по `company__slug`.
5. Подключите **urls** в `backend/config/urls.py`.

→ Подробно: [Урок 15 — Новый API CRUD](./15-new-api-crud-step-by-step.md)

### Шаг 3. Backend — тесты

1. Тест модели (валидация, tenant-границы).
2. Тест API (создание, список, 401 без токена).

→ Подробно: [Урок 16 — Тесты backend](./16-backend-tests-step-by-step.md)

### Шаг 4. Frontend — экран

1. Типы в `frontend/lib/types.ts`.
2. Функции в `frontend/lib/api.ts` (чтение).
3. Server actions в `frontend/app/actions/` (запись).
4. Компонент формы + страницы в `frontend/app/dashboard/...`.
5. Пункт в `frontend/lib/nav.ts`, если нужен в меню.

→ Подробно: [Урок 17 — Новый экран frontend](./17-new-frontend-screen-step-by-step.md)

### Шаг 5. Проверка

```bash
# Backend
cd backend
../.venv/bin/python manage.py test <app>.tests --settings=config.settings.test

# Frontend
cd frontend
npm run build
```

Откройте экран в браузере, создайте запись, обновите страницу — данные должны сохраниться.

## Правила tenant'а (обязательно)

В CRM Kit данные **всегда принадлежат компании**:

- в модели есть `ForeignKey` на `Company`;
- в API каждый запрос содержит `?company=sportmax` (или slug из cookie);
- permission `HasCompanyAccess` проверяет membership пользователя;
- нельзя привязать филиал или клиента к чужой компании.

Нарушение этих правил — самая частая ошибка новичков.

## Что делать дальше

- Распечатайте [чеклист разработчика](./18-developer-checklist.md) и отмечайте пункты.
- Потренируйтесь на [практике: CRUD абонементов](./19-practice-memberships-crud.md).

## Что изучить новичку

- разница между моделью, сериализатором и view;
- зачем три сериализатора вместо одного;
- почему запись идёт через server action, а чтение — через `lib/api.ts`;
- как устроен multi-tenant через `company` slug.
