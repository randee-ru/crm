# Этап 4 - Основа админки с Unfold

## Цель

Сделать внутреннюю админку удобной для сотрудников с помощью Unfold.

## Что добавлено

- пакет `django-unfold`
- подключение `unfold` в `INSTALLED_APPS`
- переход админ-классов на `unfold.admin.ModelAdmin`
- базовые настройки админки для более удобного внутреннего интерфейса
- собственный заголовок и название админки CRM Kit

## Почему это важно

Django admin нужен как рабочий инструмент сотрудников.
Unfold делает его современнее, понятнее и удобнее для повседневной работы.

## Что уже есть сейчас

- `Company` в админке
- `Branch` в админке
- `CompanyMembership` в админке
- базовые настройки списка, поиска и фильтров
- тест, который проверяет регистрацию моделей в admin site

## Как проверить

1. установить зависимости
2. запустить Django
3. открыть `/admin/`
4. проверить, что интерфейс использует Unfold
5. открыть модели `Company`, `Branch`, `CompanyMembership`

## Что изучить новичку

- что такое Django admin
- зачем нужен Unfold
- чем `ModelAdmin` из Unfold отличается от стандартного
- почему internal tools должны быть удобными уже на раннем этапе

## Связанные файлы

- `backend/companies/admin.py`
- `backend/branches/admin.py`
- `backend/accounts/admin.py`
- `backend/config/settings/base.py`
- `pyproject.toml`
- `backend/core/tests/test_unfold_admin.py`
- `docs/admin/unfold.md`
