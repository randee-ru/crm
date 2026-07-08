# Handoff CRM Kit

Краткий контекст для продолжения проекта в другой AI-сессии или новым разработчиком.

## Цель

CRM Kit — коммерческая SaaS CRM для сервисного бизнеса. Первая вертикаль — **фитнес-клубы** (клиент Sportmax).

---

## Production (уже развёрнуто и опубликовано)

> Состояние на **2026-07-08**: полный стек на сервере, SSL, данные восстановлены.
> **CRM и клиентский ЛК разделены по доменам.**
>
> Это уже **живая prod-версия**. Любые изменения по ролям, меню, телефонии и уведомлениям нужно вносить не только локально, но и на сервере, после чего пересобирать prod-контейнеры.

### URL и доступ

| Что | Значение |
|-----|----------|
| CRM (сотрудники) | https://crm.sportmax.fit |
| Логин CRM | `admin` / `121351` |
| Компания (slug) | `sportmax` |
| **Публичное расписание** | **https://schedule.sportmax.fit** |
| Личный кабинет клиентов | https://lk.sportmax.fit (пока редирект на расписание) |
| Healthcheck | https://crm.sportmax.fit/health/ |

Старые ссылки вида `crm.sportmax.fit/embed/schedule/...` редиректят на `https://schedule.sportmax.fit/`.
На `schedule.sportmax.fit` **токен в URL не нужен** — доступ по домену + публикация расписания в CRM.

### SSH / сервер

| Параметр | Значение |
|----------|----------|
| IP | `159.194.233.15` |
| Hostname | `dnmxzbulte` |
| SSH | `ssh root@159.194.233.15` (ключ с машины разработки; пароль не хранится в репо) |
| Каталог приложения | `/opt/crm-kit` |
| Env файл | `/opt/crm-kit/.env.prod` (**не в git**) |
| Compose | `docker-compose.prod.yml` + `--env-file .env.prod` |

### Что важно на сервере

- Прод уже поднят и работает на `crm.sportmax.fit`
- Код на сервере лежит в `/opt/crm-kit`
- После обновления кода на сервере нужно делать пересборку:
  - `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build backend frontend`
- Серверная версия должна оставаться синхронизированной с локальной, иначе изменения ролей/меню/телефонии визуально выглядят сломанными только в prod

### Уже внесённые серверные изменения

- Для сотрудника Дарьи выставлена группа `Ресепшен`
- Для Mango click-to-call используется внутренний номер `1`
- Добавлено сопоставление user/email -> Mango extension, чтобы звонки не падали с ошибкой про отсутствующий внутренний номер
- На prod уже применялись правки по ролям и доступам, поэтому новые изменения нужно дополнять поверх текущего серверного состояния, а не откатывать его
- Добавлены и задеплоены Telegram-уведомления владельцу (см. раздел «Telegram-уведомления» ниже)

### Telegram-уведомления (задеплоено 2026-07-08)

> Бот `@sportmax_kr_bot`, получатель — chat_id `318438651`. Токен и chat_id лежат в `.env.prod` на сервере
> (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_NOTIFY_CHAT_ID`) и в локальном `backend/.env` — **не в git**.

Код: `backend/notifications/telegram.py` (`send_telegram_notification`), `backend/notifications/logging_handlers.py`
(`TelegramErrorHandler`, подключён через `LOGGING["root"]` в `config/settings/base.py`).

Что уже присылает бот:

- Новая запись на групповое занятие — успех и неудача (`schedule/public_booking_views.py`)
- Вход в личный кабинет расписания — успех и неудача (`PublicScheduleLoginView`)
- Сброс пароля личного кабинета — успех и неудача (`PublicScheduleResetPasswordView`)
- Входящее сообщение от клиента (WhatsApp/Telegram/MAX) — `channels/services.py::record_messenger_message`
- Новый клиент — `clients/views.py::ClientListCreateView`
- Новая сделка/лид — `crm/deal_views.py::DealListCreateView`
- Звонки (входящие и исходящие через Mango) — `notifications/emitters.py::notify_call_telegram`,
  вызывается из `notifications/signals.py` при создании `CallLog`
- Любая ошибка уровня ERROR из любого логгера проекта (не только `django.request`) — через root-логгер

**Известное ограничение по звонкам:** запись `CallLog` создаётся не сразу при звонке, а только когда отрабатывает
`sync_mango_calls` — а это сейчас происходит **только когда кто-то открывает раздел «Телефония» в CRM**
(тот же баг, что описан ниже в разделе «Телефония и уведомления»). Пока фоновый cron для
`python manage.py sync_telephony_mango --all-companies` **специально не поставлен** (пользователь попросил
это отложить) — уведомление о звонке придёт только после того, как кто-то зайдёт в телефонию и синк отработает.
Также в `CallLog` нет поля с сотрудником/добавочным номером, поэтому бот не может написать, **какой именно
сотрудник** принял/сделал звонок — только номера звонящего/абонента и клиента (если распознан по телефону).

Локально проверено (`manage.py check`, `manage.py test schedule.tests.test_public_booking telephony notifications
clients crm channels.tests.test_gateway` — все проходят) и вживую (тестовые сообщения дошли и с локали, и с прода).

```bash
# Подключиться
ssh root@159.194.233.15

# Статус контейнеров
cd /opt/crm-kit
docker compose -f docker-compose.prod.yml --env-file .env.prod ps

# Логи
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f backend frontend nginx

# Пересборка после выкладки кода
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build backend frontend

# Тесты на сервере
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T backend \
  python manage.py test schedule.tests.test_public_booking -v 1
```

### Сервисы Docker (prod)

| Контейнер | Роль | Порт |
|-----------|------|------|
| `crm-kit-nginx-1` | HTTPS/HTTP reverse proxy | `80`, `443` |
| `crm-kit-frontend-1` | Next.js | `3000` (внутри) |
| `crm-kit-backend-1` | Django / Gunicorn | `8000` (внутри) |
| `crm-kit-postgres-1` | PostgreSQL 17 | `5432` (внутри) |
| `crm-kit-redis-1` | Redis / кэш / сессии CallCheck | `6379` (внутри) |
| `crm-kit-messenger-gateway-1` | WhatsApp / Telegram / MAX gateway | `8787` (внутри) |

Сертификаты Let's Encrypt: `/opt/crm-kit/deploy/certbot/conf/`. Nginx конфиги: `deploy/nginx/https.conf` → `deploy/nginx/default.conf`.

### Как выкатывать изменения с локальной машины

```bash
# Пример точечного rsync + rebuild (секреты не копировать)
rsync -avz ./backend/schedule/ root@159.194.233.15:/opt/crm-kit/backend/schedule/
rsync -avz ./frontend/components/schedule/ root@159.194.233.15:/opt/crm-kit/frontend/components/schedule/
ssh root@159.194.233.15 'cd /opt/crm-kit && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build backend frontend'
```

Полный bootstrap (первый подъём): `deploy/server-bootstrap.sh`, `deploy/bring-up.sh`.

**Не коммитить / не синкать в git:** `.env.prod`, `deploy/certbot/conf/`, `deploy/backups/*.tgz|*.dump`, `gateway/data/sessions/`.

### SMS.ru / CallCheck (публичное расписание)

- Интеграция SMS.ru в настройках расписания (api_id в БД; опционально `SMS_RU_API_ID` в env).
- **Имя отправителя в CRM пустое** — SMS с буквенным именем (`sportmax`) *не* используем для кодов (абонплата операторов).
- **Первый вход / сброс пароля** публичного расписания: **SMS.ru CallCheck** (клиент звонит на выданный номер → подтверждение → email + пароль). Дальше вход **телефон + пароль**.
- Исходящие SMS (если есть) логируются в карточку клиента → вкладка **SMS** (`ClientMessage`, `message_type=sms`).
- API CallCheck: `https://sms.ru/callcheck/add`, `https://sms.ru/callcheck/status` (док: https://sms.ru/api/call).

Публичные auth-эндпоинты:

```
POST /api/v1/public/schedule/<slug>/auth/login
POST /api/v1/public/schedule/<slug>/auth/forgot-password   # старт CallCheck
GET  /api/v1/public/schedule/<slug>/auth/callcheck-status?check_id=...
POST /api/v1/public/schedule/<slug>/auth/reset-password    # check_id + email + new_password
```

Прокси с реальным IP клиента: Next route `frontend/app/api/public/schedule/...`.

### Правила записи на групповые занятия (prod)

- Запись закрывается **за 1 час до начала**.
- После старта занятия запись недоступна (`can_book=false`, UI: «Идёт сейчас» / «Запись закрыта»).
- Кнопка «Войти и записаться» скрывается, если `!can_book`.

---

## Текущее состояние продукта

### Инфраструктура (код)

- Django backend + Next.js frontend
- PostgreSQL через Docker Compose (локально и prod)
- Token-auth, httpOnly cookie, middleware на frontend
- Production compose: `docker-compose.prod.yml`, entrypoint `deploy/backend-entrypoint.sh`
- Messenger gateway: `gateway/` (Node)

### Backend-модули (рабочие)

- `companies`, `branches`, `accounts` — SaaS core
- `clients` — CRUD клиентов, профиль, сообщения (`ClientMessage` в т.ч. SMS)
- `crm` — задачи, сделки, воронки, fitness funnel automation
- `schedule` — групповое расписание, публичный embed, CallCheck auth, записи
- `channels` — WhatsApp / Telegram / MAX через gateway
- `telephony` — Mango Office, click-to-call, webhooks, журнал звонков
- `employees` — тренеры
- `bookings`, `attendance`, `sales`, `payments`, `memberships`
- `marketing`, `automation`, `notifications`, `reports`, `integrations`

### Роли и доступы сотрудников

Сейчас используется 4 группы пользователей:

1. `Админы`
2. `Менеджеры` — пока доступны все те же функции
3. `Ресепшен` — видят только `CRM`, `Совместную работу`, все вкладки в ней и в разделе `Фитнес` должны видеть `Расписание`
4. `Пользователи` — не имеют доступа к админке, но могут быть зарегистрированными сотрудниками

Дополнительно:

- каждому сотруднику можно назначать группу
- в каждой группе можно включать и выключать отдельные права
- для `Ресепшен` должен быть доступен раздел `Клиенты`
- это правило уже учитывается в коде, но при дальнейших изменениях его нужно не потерять на сервере

### Frontend (ключевое)

- Dashboard CRM, канбан сделок, список/карточка клиентов
- Расписание `/dashboard/schedule`, публичное `/schedule/[slug]` и embed
- Телефония, сообщения (мессенджеры), сотрудники, настройки
- UI в стиле Bitrix24

### Телефония и уведомления

- Основной webhook Mango уже настроен на `/api/mango/callback`
- Если уведомления не приходят до открытия раздела телефонии, значит не срабатывал фоновый sync звонков
- Решение: background sync Mango должен работать и без входа в телефонию
- Это нужно проверять и на локали, и на сервере, потому что проблема проявляется только в prod-цепочке webhook/sync/notifications

### Расписание (ключевая фича)

**Модель данных:**

- `GroupProgram` — каталог программ
- `GroupScheduleSlot` — занятие на дату (`session_date` + время)
- `GroupSlotEnrollment` — записи клиентов
- `ScheduleSettings` — лимиты, публикация, `embed_token`
- `ScheduleSmsIntegration` — SMS.ru и др.
- `Client.schedule_portal_password` — пароль портала расписания
- `Client.email` — собирается при первом входе после CallCheck

**Поведение UI публичного расписания:**

- Вход: телефон + пароль
- Первый вход / сброс: звонок CallCheck → email + пароль
- Нормализация телефона: `+7` / `7` / `8` / 10 цифр без удвоения ведущей `7`
- Модалка «Подробнее», скрытие кнопки записи если нельзя записаться

## Локальный запуск

```bash
docker compose up -d postgres redis
cd backend && ../.venv/bin/python manage.py runserver 127.0.0.1:8000 --settings=config.settings.dev
cd frontend && npm run dev
# опционально gateway:
cd gateway && npm start
```

Логин: `admin` / `121351`, компания `sportmax`  
Локальный UI: `http://127.0.0.1:3000`

**Важно:** не запускать `npm run build` при работающем `npm run dev` (битый кэш `.next`).

## Ключевые файлы (свежие)

| Область | Пути |
|---------|------|
| CallCheck / портал расписания | `backend/schedule/client_auth.py`, `sms.py`, `public_booking*.py` |
| Публичное UI auth | `frontend/components/schedule/schedule-embed-auth-panel.tsx` |
| Телефон нормализация | `frontend/lib/phone.ts`, `backend/telephony/phone.py` |
| Prod deploy | `docker-compose.prod.yml`, `deploy/` |
| Messenger gateway | `gateway/`, `backend/channels/` |

## Документация

- **Указатель:** `docs/README.md`
- **Уроки:** `docs/lessons/`
- **API:** `docs/api/`
- **Этапы:** `docs/stages/`
- **Воронки:** `docs/crm-funnels.md`

## Следующие шаги

- **Если нужны своевременные Telegram-уведомления о звонках** — поставить cron на сервере
  (`*/N * * * * ... exec backend python manage.py sync_telephony_mango --all-companies`), сейчас его нет
  по просьбе пользователя, звонки подтягиваются только при открытии раздела «Телефония» (см. «Telegram-уведомления»)
- Опционально: добавить поле сотрудника/добавочного на `CallLog`, чтобы в уведомлении о звонке было видно,
  кто именно из сотрудников принял/сделал звонок (сейчас известны только номера и клиент)
- Проверить на prod, что `Ресепшен` действительно видит `CRM`, `Совместную работу`, `Клиенты` и `Расписание` в `Фитнес`
- Проверить, что звонки и уведомления приходят без необходимости открывать телефонию вручную
- Держать локальный и серверный код синхронизированными перед тестированием изменений
- Убрать/не использовать буквенный sender `sportmax` в кабинете SMS.ru (если остался default) — для CallCheck не нужен
- Webhook CallCheck от SMS.ru (сейчас polling статуса) — ускорит UX
- SMS-напоминания по cron (`ScheduleSettings.sms_reminder_hours`) — по желанию, без буквенного имени
- Monitoring, бэкапы БД по расписанию, disk cleanup на сервере (~80% disk, 2GB RAM)
- Полировка Stage 5 UX: продажи, платежи, бронь/посещаемость
- Sigur / RFID — полноценная синхронизация
- OpenAI транскрипция звонков — нужен billing OpenAI
