# Урок 18 — Чеклист разработчика CRM Kit

Распечатайте или держите открытым при каждой новой задаче.

## Перед началом

- [ ] Прочитан [Урок 13 — полная карта разработки](./13-how-to-develop-full-feature.md)
- [ ] Запущены postgres, backend, frontend (см. [Урок 06](./06-how-to-run-local-project.md))
- [ ] Понятно, в каком **модуле** живёт сущность
- [ ] Понятно, нужен ли **филиал** в модели

## Backend — модель

- [ ] Модель наследует `TimeStampedModel`
- [ ] Есть `ForeignKey` на `Company`
- [ ] Есть `clean()` / валидация tenant-границ (если есть branch)
- [ ] `makemigrations` + `migrate`
- [ ] Модель зарегистрирована в admin (dev)
- [ ] Тест модели в `tests/test_models.py`

## Backend — API

- [ ] `ListSerializer`, `DetailSerializer`, `WriteSerializer`
- [ ] View с `TokenAuthentication`, `IsAuthenticated`, `HasCompanyAccess`
- [ ] Queryset фильтруется по `company__slug`
- [ ] `company` передаётся в context при create
- [ ] URLs в модуле + `include` в `config/urls.py`
- [ ] Проверка curl / Postman
- [ ] Тест API в `tests/test_api.py`
- [ ] Документация в `docs/api/`

## Frontend — типы и API

- [ ] Типы `*Record`, `*Detail`, `*WriteInput` в `lib/types.ts`
- [ ] `getThings()` / `getThing(id)` в `lib/api.ts`
- [ ] Server actions create/update в `app/actions/`
- [ ] `revalidatePath` после записи

## Frontend — UI

- [ ] Client form component с `useActionState`
- [ ] Страница списка
- [ ] Страница `/new`
- [ ] Страница `/[id]` для редактирования
- [ ] Пункт в `lib/nav.ts` (если нужен в меню)
- [ ] `npm run build` проходит

## Безопасность и tenant

- [ ] Нельзя прочитать чужую компанию по ID
- [ ] Нельзя привязать branch из другой компании
- [ ] API без токена → 401
- [ ] API без membership → 403

## Финальная проверка

- [ ] `manage.py test <module> --settings=config.settings.test`
- [ ] Создание через UI
- [ ] Редактирование через UI
- [ ] Данные видны после перезагрузки страницы
- [ ] Обновлён `handoff.md` (если большая фича)

## Быстрые команды

```bash
# Backend
docker compose up -d postgres
cd backend
../.venv/bin/python manage.py migrate --settings=config.settings.dev
../.venv/bin/python manage.py runserver 127.0.0.1:8000 --settings=config.settings.dev

# Тесты
../.venv/bin/python manage.py test --settings=config.settings.test

# Frontend
cd frontend
npm run dev
```

## Если что-то сломалось

| Проблема | Действие |
|----------|----------|
| Django не открывается | `docker stop crm-kit-backend` — не запускайте backend в Docker и локально одновременно |
| Pillow / ImageField | `pip install Pillow` |
| Frontend 500 | Проверьте, что backend на :8000 отвечает `/health/` |
| JS не работает | `npm run dev` (скрипт очистит `.next`) + Cmd+Shift+R |
