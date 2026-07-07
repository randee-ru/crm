# Урок 19 — Практика: CRUD абонементов (следующая фича)

## Задание

Собрать **полный цикл** для абонементов (`Membership`): список, создание, редактирование — по чеклисту из урока 18.

Модель уже есть в `backend/memberships/models.py`. Нужно довести до рабочего продукта.

## Что уже готово

- [x] Модель `Membership` с полями title, status, visits_total, visits_used, даты
- [x] Связь с `Client` и `Company`
- [x] Admin в dev
- [x] Тесты модели

## Что нужно сделать вам

### Backend

1. **Сериализаторы** `backend/memberships/serializers.py`:
   - `MembershipListSerializer` — id, title, status, client_name, даты, остаток визитов
   - `MembershipDetailSerializer` — все поля
   - `MembershipWriteSerializer` — client_id, title, status, visits_total, starts_at, ends_at

2. **Views** `backend/memberships/views.py`:
   - Фильтр по `company__slug`
   - Фильтр `?client_id=` для абонементов одного клиента
   - Валидация: client принадлежит той же company

3. **URLs**:
   ```
   GET/POST  /api/v1/memberships/?company=sportmax
   GET/PATCH /api/v1/memberships/<id>/?company=sportmax
   ```

4. **Тесты** `backend/memberships/tests/test_api.py`

### Frontend

1. Типы `MembershipRecord`, `MembershipDetail`, `MembershipWriteInput`

2. Страницы:
   - `/dashboard/memberships` — таблица всех абонементов
   - `/dashboard/memberships/new` — форма (выбор клиента из списка)
   - `/dashboard/clients/[id]` — блок «Абонементы клиента» (опционально, но полезно)

3. Форма с полями:
   - Клиент (select)
   - Название абонемента
   - Статус (active / frozen / expired)
   - Количество визитов
   - Даты начала и окончания

4. Пункт «Абонементы» в sidebar (или вкладка в CRM)

## Подсказки

### Остаток визитов в serializer

```python
def get_visits_left(self, obj):
    if obj.visits_total is None:
        return None
    return max(obj.visits_total - obj.visits_used, 0)
```

### Select клиента на форме

На странице `new` загрузите `getClients()` и передайте в форму — как `getBranches()` в `client-form`.

### Связь с карточкой клиента

На `clients/[id]/page.tsx` добавьте запрос `getMemberships({ clientId })` и таблицу под данными клиента.

## Критерии «готово»

- [ ] Менеджер создаёт абонемент из UI
- [ ] Абонемент виден в списке
- [ ] Нельзя привязать клиента другой компании (тест + API 400)
- [ ] `manage.py test memberships --settings=config.settings.test` — зелёный
- [ ] `npm run build` — без ошибок

## Если застряли

1. Откройте `backend/clients/` — сделайте то же самое для memberships.
2. Сверьтесь с [чеклистом](./18-developer-checklist.md).
3. Проверьте API через curl до того, как трогать frontend.

## После этой практики

Вы будете уметь добавлять **любую** сущность в CRM Kit по одному и тому же шаблону: расписание, продажи, сотрудники, уведомления.

Следующие кандидаты по roadmap:

- создание событий расписания из UI
- refresh token
- audit log при удалении клиента
