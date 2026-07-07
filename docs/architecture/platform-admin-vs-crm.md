# Платформа vs CRM: разделение интерфейсов

## Два разных интерфейса

CRM Kit — это SaaS-платформа с **двумя слоями UI**:

| Слой | URL | Кто входит | Задача |
|------|-----|------------|--------|
| **Платформа** | `/admin/` | Разработчик, системный администратор | Тенанты, пользователи, доступы, API-токены |
| **CRM** | `http://localhost:3000` | Менеджеры, администраторы клуба | Клиенты, задачи, расписание, продажи |

Сотрудники фитнес-клуба **не работают** в Django admin. Они используют frontend с модульным CRM-shell.

## Что в `/admin/` (платформа)

Всегда доступно:

- **Компании** — тенанты SaaS
- **Филиалы** — структура внутри компании
- **Доступы пользователей** — `CompanyMembership`, роли, привязка к компании
- **Пользователи / Группы** — учётные записи Django
- **API-токены** — для интеграций и отладки auth

## Что НЕ в `/admin/` по умолчанию

Операционные CRM-модули скрыты из admin в production:

- Клиенты
- Абонементы
- Задачи
- События расписания

Они управляются через **REST API** и **Next.js frontend**.

### Dev-режим

При `ADMIN_ENABLE_BUSINESS_MODELS=True` (включено в `config.settings.dev`) бизнес-модели появляются в sidebar в секции **«Данные CRM (только dev)»** — для отладки данных, не для повседневной работы.

## Модульная архитектура

```
backend/                    frontend/
├── companies/   ──API──►   app/dashboard/     (CRM hub)
├── branches/               app/dashboard/tasks/
├── accounts/               app/dashboard/schedule/
├── clients/                components/        (shell + domain UI)
├── crm/                    lib/api.ts         (read)
├── schedule/               app/actions/       (write)
└── memberships/
```

Каждый Django-app — **изолированный backend-модуль** со своими models, API, admin (если нужен).

Frontend собирает **модульные экраны** из общего shell (`DashboardShell`, `Sidebar`, `CrmModuleHeader`) и доменных компонентов (`client-form`, `task-filters` и т.д.).

## Настройки

- `ADMIN_ENABLE_BUSINESS_MODELS` — `False` в base, `True` в dev
- `UNFOLD` — sidebar с секциями «Платформа», «Пользователи и API», «Данные CRM (dev)»
- Ссылка **«Рабочий CRM (frontend)»** в dropdown заголовка admin

## Связанные файлы

- `backend/config/unfold.py` — навигация admin
- `backend/config/admin_registry.py` — условная регистрация CRM-моделей
- `backend/config/platform_auth_admin.py` — User/Group/Token
- `frontend/lib/nav.ts` — навигация CRM-модулей
