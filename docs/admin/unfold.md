# Админка: Unfold + панель платформы

## Назначение

`/admin/` — **панель платформы** для разработчиков и системных администраторов.

Сотрудники клубов работают в **frontend CRM** (`http://localhost:3000`), не в Django admin.

## Что проверяем в тестах

- админ-классы платформы наследуются от `unfold.admin.ModelAdmin`
- `Company`, `Branch`, `CompanyMembership` зарегистрированы
- CRM-модели (`Client`, `Task`) **не** в admin при `ADMIN_ENABLE_BUSINESS_MODELS=False`

## Связанный тест

`backend/core/tests/test_unfold_admin.py`

## Архитектура

`docs/architecture/platform-admin-vs-crm.md`
