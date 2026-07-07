# Этап 4 - Основа админки с Unfold

## Цель

Сделать **панель платформы** для разработчиков и системных администраторов.

`/admin/` — не рабочий CRM для сотрудников клуба. Операционные модули (клиенты, задачи, расписание) живут во frontend.

## Что добавлено

- пакет `django-unfold`
- подключение `unfold` в `INSTALLED_APPS`
- переход админ-классов на `unfold.admin.ModelAdmin`
- sidebar с секциями: **Платформа**, **Пользователи и API**, **Данные CRM (dev)**
- условная регистрация CRM-моделей через `ADMIN_ENABLE_BUSINESS_MODELS`
- User/Group/Token с оформлением Unfold

## Что в платформенной админке

- `Company` — тенанты
- `Branch` — филиалы
- `CompanyMembership` — доступы и роли
- `User`, `Group`, `Token` — учётные записи и API

## Что скрыто из admin по умолчанию

- `Client`, `Membership`, `Task`, `ScheduleEvent` — только через frontend + API
- в dev (`config.settings.dev`) доступны в секции «Данные CRM (только dev)»

## Как проверить

1. установить зависимости
2. запустить Django с `config.settings.dev`
3. открыть `/admin/` — sidebar показывает платформу, не полный CRM
4. кликнуть «Рабочий CRM (frontend)» — переход на `http://localhost:3000/dashboard`

## Архитектура

См. `docs/architecture/platform-admin-vs-crm.md`

## Связанные файлы

- `backend/config/unfold.py`
- `backend/config/admin_registry.py`
- `backend/config/platform_auth_admin.py`
- `backend/companies/admin.py`
- `backend/branches/admin.py`
- `backend/accounts/admin.py`
- `backend/core/tests/test_unfold_admin.py`
