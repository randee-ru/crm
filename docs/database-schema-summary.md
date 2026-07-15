# CRM Kit: таблицы и сложные SQL

Источник данных: локальная копия проекта и локальная база PostgreSQL.

## Кратко

- Таблиц в базе: **58**
- Схема: **public**
- Ручного SQL в коде почти нет
- Основная сложность проекта находится в ORM-запросах Django: `Subquery`, `Exists`, `OuterRef`, `annotate`, `aggregate`

## Таблицы

| Таблица | Модель | Назначение |
|---|---|---|
| `accounts_companymembership` | `accounts.CompanyMembership` | Доступы пользователей |
| `accounts_employeeinvitation` | `accounts.EmployeeInvitation` | Приглашения сотрудников |
| `accounts_userprofile` | `accounts.UserProfile` | Профили пользователей |
| `attendance_attendancerecord` | `attendance.AttendanceRecord` | Посещения |
| `auth_group` | `auth.Group` | Группы |
| `auth_group_permissions` | `auth.Group_permissions` | Связи group-permission |
| `auth_permission` | `auth.Permission` | Права |
| `auth_user` | `auth.User` | Пользователи |
| `auth_user_groups` | `auth.User_groups` | Связи user-group |
| `auth_user_user_permissions` | `auth.User_user_permissions` | Связи user-permission |
| `authtoken_token` | `authtoken.Token` | API-токены |
| `automation_automationevent` | `automation.AutomationEvent` | События автоматизации |
| `automation_automationrule` | `automation.AutomationRule` | Правила автоматизации |
| `bookings_booking` | `bookings.Booking` | Бронирования |
| `branches_branch` | `branches.Branch` | Филиалы |
| `channels_messengeraccount` | `channels.MessengerAccount` | Аккаунты мессенджеров |
| `channels_messengerintegration` | `channels.MessengerIntegration` | Интеграции мессенджеров |
| `channels_messengermessage` | `channels.MessengerMessage` | Сообщения мессенджеров |
| `channels_messengerthread` | `channels.MessengerThread` | Диалоги мессенджеров |
| `clients_client` | `clients.Client` | Клиенты |
| `clients_clientlead` | `clients.ClientLead` | Лиды клиентов |
| `clients_clientmessage` | `clients.ClientMessage` | Сообщения клиентов |
| `companies_company` | `companies.Company` | Компании |
| `contracts_contract` | `contracts.Contract` | Договоры |
| `crm_deal` | `crm.Deal` | Сделки |
| `crm_dealcontacthistory` | `crm.DealContactHistory` | Контакты по сделкам |
| `crm_dealpipeline` | `crm.DealPipeline` | Воронки |
| `crm_dealstage` | `crm.DealStage` | Этапы воронки |
| `crm_dealstagehistory` | `crm.DealStageHistory` | История этапов сделок |
| `crm_task` | `crm.Task` | Задачи |
| `django_admin_log` | `admin.LogEntry` | Журнал действий админки |
| `django_content_type` | `contenttypes.ContentType` | Типы содержимого Django |
| `django_migrations` | system table | История миграций |
| `django_session` | `sessions.Session` | Сессии |
| `drive_driveitem` | `drive.DriveItem` | Элементы диска |
| `employees_trainer` | `employees.Trainer` | Тренеры |
| `employees_traineraccesscard` | `employees.TrainerAccessCard` | Карты доступа тренеров |
| `employees_trainerrentpayment` | `employees.TrainerRentPayment` | Оплаты аренды тренеров |
| `integrations_integrationconnection` | `integrations.IntegrationConnection` | Интеграции |
| `integrations_integrationevent` | `integrations.IntegrationEvent` | События интеграций |
| `mailbox_mailaccount` | `mailbox.MailAccount` | Почтовые ящики |
| `mailbox_mailmessage` | `mailbox.MailMessage` | Письма |
| `marketing_marketingcampaign` | `marketing.MarketingCampaign` | Маркетинговые кампании |
| `marketing_marketingintegration` | `marketing.MarketingIntegration` | Маркетинговые интеграции |
| `memberships_membership` | `memberships.Membership` | Абонементы |
| `messaging_chatmessage` | `messaging.ChatMessage` | Сообщения |
| `messaging_chatroom` | `messaging.ChatRoom` | Чаты |
| `notifications_notification` | `notifications.Notification` | Уведомления |
| `payments_payment` | `payments.Payment` | Платежи |
| `sales_sale` | `sales.Sale` | Продажи |
| `schedule_groupprogram` | `schedule.GroupProgram` | Групповые программы |
| `schedule_groupscheduleslot` | `schedule.GroupScheduleSlot` | Слоты группового расписания |
| `schedule_groupslotenrollment` | `schedule.GroupSlotEnrollment` | Записи на групповые занятия |
| `schedule_scheduleevent` | `schedule.ScheduleEvent` | События расписания |
| `schedule_schedulesettings` | `schedule.ScheduleSettings` | Настройки расписания |
| `schedule_schedulesmsintegration` | `schedule.ScheduleSmsIntegration` | SMS-интеграции расписания |
| `telephony_calllog` | `telephony.CallLog` | Звонки |
| `telephony_telephonyintegration` | `telephony.TelephonyIntegration` | Интеграции телефонии |

## Какие SQL-запросы сложные

### 1. Подзапросы и существование строк

Используются Django ORM-конструкции:

- `Subquery`
- `Exists`
- `OuterRef`

Примеры:

- [backend/clients/views.py](../backend/clients/views.py)
  - поиск последнего абонемента клиента через `Subquery`
  - поиск по телефону через нормализацию цифр
- [backend/crm/dashboard_services.py](../backend/crm/dashboard_services.py)
  - флаг просроченных задач через `Exists`
- [backend/crm/deal_views.py](../backend/crm/deal_views.py)
  - аннотация сделок флагом `has_overdue_task`
- [backend/employees/views.py](../backend/employees/views.py)
  - проверка оплаты аренды тренера за текущий месяц через `Exists`

### 2. Агрегации

Используются:

- `Count`
- `Sum`
- фильтрованные агрегаты `Count(..., filter=Q(...))`

Примеры:

- [backend/crm/dashboard_services.py](../backend/crm/dashboard_services.py)
  - сводки по продажам и продлению
- [backend/crm/analytics_views.py](../backend/crm/analytics_views.py)
  - агрегаты для аналитики
- [backend/reports/services.py](../backend/reports/services.py)
  - дневные и периодические отчёты
- [backend/crm/pipeline_views.py](../backend/crm/pipeline_views.py)
  - счётчики сделок по этапам
- [backend/schedule/group_views.py](../backend/schedule/group_views.py)
  - счётчики записей на слоты

### 3. Поиск по строкам и телефонам

Есть много запросов вида:

- `Q(field__icontains=search)`
- поиск по телефонам через `digits_only(...)`
- поиск по нескольким полям одновременно

Примеры:

- [backend/clients/views.py](../backend/clients/views.py)
- [backend/telephony/views.py](../backend/telephony/views.py)
- [backend/schedule/views.py](../backend/schedule/views.py)
- [backend/bookings/views.py](../backend/bookings/views.py)
- [backend/payments/views.py](../backend/payments/views.py)
- [backend/contracts/views.py](../backend/contracts/views.py)

### 4. Что важно понимать программисту

- Проект почти полностью на Django ORM, без тяжёлого raw SQL
- Самые чувствительные места по нагрузке:
  - списки клиентов
  - CRM-воронки и dashboard
  - телеметрия звонков
  - расписание групповых занятий
- Если нужно оптимизировать БД, смотреть стоит в сторону:
  - индексов на `phone`, `external_id`, `created_at`, `company_id`
  - сокращения тяжёлых `annotate/subquery`
  - пагинации и уменьшения количества `prefetch_related`

