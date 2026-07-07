# Handoff CRM Kit

Краткий контекст для продолжения проекта в другой AI-сессии или новым разработчиком.

## Цель

CRM Kit — коммерческая SaaS CRM для сервисного бизнеса. Первая вертикаль — **фитнес-клубы**.

## Текущее состояние

### Инфраструктура

- Django backend + Next.js frontend
- PostgreSQL через Docker Compose
- Token-auth, httpOnly cookie, middleware на frontend
- `seed_demo` — компании `sportmax`, `fitpro`, демо-данные

### Backend-модули (рабочие)

- `companies`, `branches`, `accounts` — SaaS core
- `clients` — CRUD клиентов, профиль, сообщения
- `crm` — задачи, сделки, воронки (`DealPipeline`, `DealStage`)
- `schedule` — **групповое расписание** (`GroupProgram`, `GroupScheduleSlot` с `session_date`), настройки, SMS-интеграции, записи на занятия
- `telephony` — Mango Office, журнал звонков, локальное хранение записей (1 год)
- `employees` — тренеры
- `bookings`, `attendance`, `sales`, `payments`, `memberships`
- `marketing` — интеграции (в т.ч. SMS для рассылок)
- `automation` — очередь событий, правила, действия
- `notifications` — уведомления для панели и automation actions
- `reports` — daily report + analytics overview
- `integrations` — реестр внешних интеграций и webhook log

### Stage 5 progress

- `Сотрудники` закрыты до полного цикла: приглашения, принятие по ссылке, активация доступа, редактирование ролей и филиалов
- `Абонементы` переведены с мокового экрана на реальный CRUD:
  - список с поиском и фильтром по статусу
  - карточка абонемента
  - создание, редактирование и удаление
  - backend API и тесты покрывают list/create/detail/update/delete
- `Посещаемость` переведена на рабочий CRUD:
  - список, фильтры и график посещаемости
  - создание, карточка записи, редактирование и удаление
  - backend API и тесты покрывают list/create/detail/update/delete
- Убрана правая колонка с CRM-экрана сделок, чтобы основная воронка была шире и чище
- Добавлен отдельный `Дневной отчет` в `/dashboard/daily-report`:
  - собирает телефонию, мессенджеры, заявки сайта, посещения, продажи и платежи
  - работает по дате и использует backend-агрегатор
  - план и источники отображаются в боковой колонке
- `Тренеры` переведены на CRUD:
  - список с поиском и фильтром по активности
  - карточка тренера
  - создание, редактирование и удаление
  - backend API и тесты покрывают list/create/detail/update/delete
- Остальные пункты Stage 5 ещё в очереди: бронирования, продажи, платежи, UX-полировка Bitrix24

### Stage 8-11 progress

- `Stage 8` started: есть backend каркас `automation` и `notifications`, а уведомления уже подаются в UI из backend
- `Stage 9` started: отдельный модуль `reports` и экран `/dashboard/reports`
- `Stage 10` started: модуль `integrations` с реестром подключений и webhook log
- `Stage 11` started: добавлен CI workflow и production checklist

### Frontend

- Dashboard CRM (канбан сделок + список клиентов)
- CRUD клиентов, **редизайн карточки клиента**
- **Расписание групповых программ** — `/dashboard/schedule`
- **Телефония** — `/dashboard/telephony` (вынесена в секцию «Фитнес»)
- **Сотрудники** — `/dashboard/employees`, приглашения, карточка доступа, настройки ролей/филиалов
- Настройки: инструменты, воронки CRM, **расписание** (лимиты, SMS-напоминания, SMS-сервисы)
- UI в стиле Bitrix24, иконки lucide-react
- Локальный dev: `http://127.0.0.1:3000`

### Расписание (ключевая фича)

**Модель данных:**

- `GroupProgram` — каталог программ (22 шт., seed при первом запросе)
- `GroupScheduleSlot` — **конкретное занятие на дату** (`session_date` + `start_time` / `end_time`), не повтор по дню недели
- `GroupSlotEnrollment` — записи клиентов на слот
- `ScheduleSettings` — лимит участников, часы SMS-напоминаний
- `ScheduleSmsIntegration` — провайдеры SMS (SMS.ru, SMSC и др.)

**API:**

```
GET    /api/v1/schedule/programs/?company=<slug>
GET    /api/v1/schedule/group-slots/?company=<slug>&from=YYYY-MM-DD&to=YYYY-MM-DD
POST   /api/v1/schedule/group-slots/?company=<slug>
PATCH  /api/v1/schedule/group-slots/<id>/?company=<slug>
DELETE /api/v1/schedule/group-slots/<id>/?company=<slug>
GET    /api/v1/schedule/settings/?company=<slug>
PATCH  /api/v1/schedule/settings/?company=<slug>
GET/POST /api/v1/schedule/sms-integrations/?company=<slug>
GET/PATCH/DELETE /api/v1/schedule/sms-integrations/<id>/?company=<slug>
GET/POST /api/v1/schedule/group-slots/<id>/enrollments/?company=<slug>
```

**Frontend:**

| Путь | Назначение |
|------|------------|
| `frontend/components/schedule/schedule-workspace.tsx` | Календарь, drag-and-drop, модалка редактирования |
| `frontend/components/schedule/schedule-week-swiper.tsx` | Навигация по неделям (Swiper) |
| `frontend/lib/schedule-week.ts` | Даты, форматирование недели |
| `frontend/app/actions/schedule.ts` | Server actions |
| `frontend/components/settings/settings-schedule-section.tsx` | Настройки расписания |

**Поведение UI:**

- Календарь показывает **конкретные даты** (не «каждый понедельник»)
- Перелистывание недель — стрелки и свайп (Swiper)
- Перетаскивание программы создаёт слот **только на выбранную дату**
- Карандаш на карточке — редактирование + список записавшихся

### Телефония

- Стриминг и локальный кэш записей в `media/telephony/recordings/`
- Авто-архивация новых звонков (signal + sync)
- Sticky sidebar, прокрутка только списка звонков

### Сотрудники / приглашения

- модель `EmployeeInvitation`
- API:
  - `GET/POST /api/v1/staff/invitations/`
  - `GET/PATCH/DELETE /api/v1/staff/invitations/<id>/`
  - `GET /api/v1/staff/dashboard/`
  - `GET/PATCH /api/v1/staff/memberships/<id>/`
  - `POST /api/v1/auth/accept-invite/`
- фронт:
  - `/login?invite=<token>` открывает форму принятия приглашения
  - `/dashboard/employees` показывает список сотрудников, приглашения и быстрые действия
  - `/dashboard/employees/<id>` редактирует доступ конкретного сотрудника

## Локальный запуск

```bash
docker compose up -d postgres
cd backend && ../.venv/bin/python manage.py runserver 127.0.0.1:8000 --settings=config.settings.dev
cd frontend && npm run dev
```

Логин: `admin` / `121351`, компания `sportmax`

**Важно:** не запускать `npm run build` при работающем `npm run dev` (битый кэш `.next`).

Миграции расписания:

```bash
cd backend && ../.venv/bin/python manage.py migrate schedule --settings=config.settings.dev
```

## Ключевые файлы

| Область | Пути |
|---------|------|
| Групповое расписание | `backend/schedule/models.py`, `group_views.py`, `group_serializers.py` |
| Программы (seed) | `backend/schedule/group_programs.py` |
| Расписание UI | `frontend/components/schedule/` |
| Настройки расписания | `frontend/app/dashboard/settings/page.tsx` → `section=schedule` |
| Телефония | `backend/telephony/`, `frontend/components/telephony/` |
| Канбан | `frontend/components/crm-kanban-board.tsx` |
| Навигация | `frontend/lib/nav.ts` |

## Документация

- **Указатель:** `docs/README.md`
- **Уроки:** `docs/lessons/` (01–21)
- **API:** `docs/api/`
- **Этапы:** `docs/stages/` (01–08)

## Следующие шаги

- Закрыть `Stage 5` по очереди:
  - бронирования
  - посещаемость
  - продажи
  - платежи
  - тренеры и связанные карточки/настройки
- Доработать UX под Bitrix24: выровнять меню, верхние панели, таблицы и карточки
- Добить документацию и уроки на русском
- История приглашений и действия: повторная отправка, отмена, деактивация, журнал изменений
- Довести дневной отчет до полного цикла:
  - подключить отдельный модуль отзывов и оценок
  - точнее разделить источники Telegram / WhatsApp / MAX на уровне интеграций
  - добавить явный признак "продление" в продажах
- Stage 8:
  - расширять automation rules для продаж, бронирований, оплат и посещаемости
  - добавлять реальные notification сценарии из бизнес-событий
- Stage 9:
  - расширить отчёты по менеджерам, филиалам и источникам
- Stage 10:
  - подключать реальные Sigur / RFID / платежи / турникеты
- Stage 11:
  - добавить monitoring, backup runbooks и security flags
- Проверить и доработать UX списков тренеров, если потребуется более плотный Bitrix-вид карточек
- Отправка SMS-напоминаний по cron (используя `ScheduleSettings.sms_reminder_hours` + `ScheduleSmsIntegration`)
- Дублирование недели / шаблон расписания (массовое создание слотов на диапазон дат)
- Привязка `Booking` к `GroupScheduleSlot`
- OpenAI транскрипция звонков — требует активного billing на аккаунте OpenAI
- Inline-редактор воронок в settings
- История смены этапов сделки
