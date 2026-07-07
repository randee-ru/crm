# Урок 20 — Разбор реального примера: профиль пользователя

## Зачем этот урок

Уроки 14–17 теоретические. Здесь — **реальная фича**, уже в репозитории: редактирование имени, email и фото профиля.

## Что сделано

| Слой | Файл |
|------|------|
| Модель | `backend/accounts/models.py` → `UserProfile` |
| Миграция | `backend/accounts/migrations/0002_userprofile.py` |
| Serializer | `ProfileUpdateSerializer` в `serializers.py` |
| API | `PATCH /api/v1/auth/me/` в `views.py` → `MeView.patch` |
| Тест | `test_me_patch_updates_profile` в `accounts/tests/test_api.py` |
| Action | `frontend/app/actions/profile.ts` |
| Форма | `frontend/components/profile-form.tsx` |
| Страница | `frontend/app/dashboard/profile/page.tsx` |
| Аватар | `frontend/components/user-avatar.tsx` |

## Особенность: не отдельный CRUD

Профиль не имеет `/api/v1/profiles/`. Пользователь редактирует **себя** через `/api/v1/auth/me/`.

Это нормальный паттерн для «моих настроек».

## Backend: модель с файлом

```python
class UserProfile(TimeStampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, ...)
    avatar = models.ImageField(upload_to="avatars/%Y/%m/", blank=True, null=True)
```

Нужен **Pillow**: `pip install Pillow`.

Медиафайлы в dev: `config/urls.py` отдаёт `/media/` при `DEBUG=True`.

## Backend: PATCH с JSON и файлом

`ProfileUpdateSerializer` принимает:

- `first_name`, `last_name`, `email` — JSON или form fields
- `avatar` — файл в `multipart/form-data`

View обновляет `User` и `UserProfile`, возвращает полную сессию.

## Frontend: FormData для фото

`updateProfileAction` собирает `FormData`:

```typescript
body.append("first_name", firstName);
body.append("avatar", file);  // только если выбран
```

Заголовок `Content-Type` **не ставим** — браузер сам поставит boundary.

## Frontend: превью до сохранения

`profile-form.tsx`:

- `URL.createObjectURL(file)` для мгновенного превью
- `router.refresh()` после успеха — обновляет sidebar и header
- `key` на форме сбрасывает state после сохранения

## Что вынести в свой код

1. Любое поле с **файлом** → FormData + ImageField + Pillow.
2. Любые **личные настройки** → endpoint `/me/`, не отдельная таблица в UI.
3. После записи → `revalidatePath` + `router.refresh()`.

## Упражнение

Добавьте кнопку «Удалить фото»:

- Backend: `avatar=null` в PATCH
- Frontend: отдельный submit или flag `remove_avatar=1`

## Следующий шаг

- [Урок 21 — Канбан и воронки фитнес-клуба](./21-real-example-fitness-kanban-pipelines.md) — более сложный пример с миграцией данных
- [Практика с абонементами](./19-practice-memberships-crud.md) — примените шаблон к своей сущности
