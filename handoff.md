# Handoff CRM Kit

Краткий контекст для продолжения проекта в другой AI-сессии или новым разработчиком.

## Цель

CRM Kit — коммерческая SaaS CRM для сервисного бизнеса. Первая вертикаль — **фитнес-клубы** (клиент Sportmax).

---

## Production (уже развёрнуто и опубликовано)

> Состояние на **2026-07-08**: полный стек поднят на сервере, SSL работает, данные клиентов восстановлены, публичное расписание и CallCheck-авторизация задеплоены. Дальнейшая разработка может идти локально, но **боевая система уже онлайн**.

### URL и доступ в CRM

| Что | Значение |
|-----|----------|
| Сайт CRM | https://crm.sportmax.fit |
| Логин админа | `admin` / `121351` |
| Компания (slug) | `sportmax` |
| Healthcheck | https://crm.sportmax.fit/health/ |
| Публичное расписание | https://crm.sportmax.fit/schedule/sportmax (нужен embed token из настроек расписания) |

### SSH / сервер

| Параметр | Значение |
|----------|----------|
| IP | `159.194.233.15` |
| Hostname | `dnmxzbulte` |
| SSH | `ssh root@159.194.233.15` (ключ с машины разработки; пароль не хранится в репо) |
| Каталог приложения | `/opt/crm-kit` |
| Env файл | `/opt/crm-kit/.env.prod` (**не в git**) |
| Compose | `docker-compose.prod.yml` + `--env-file .env.prod` |

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

### Frontend (ключевое)

- Dashboard CRM, канбан сделок, список/карточка клиентов
- Расписание `/dashboard/schedule`, публичное `/schedule/[slug]` и embed
- Телефония, сообщения (мессенджеры), сотрудники, настройки
- UI в стиле Bitrix24

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

- Убрать/не использовать буквенный sender `sportmax` в кабинете SMS.ru (если остался default) — для CallCheck не нужен
- Webhook CallCheck от SMS.ru (сейчас polling статуса) — ускорит UX
- SMS-напоминания по cron (`ScheduleSettings.sms_reminder_hours`) — по желанию, без буквенного имени
- Monitoring, бэкапы БД по расписанию, disk cleanup на сервере (~80% disk, 2GB RAM)
- Полировка Stage 5 UX: продажи, платежи, бронь/посещаемость
- Sigur / RFID — полноценная синхронизация
- OpenAI транскрипция звонков — нужен billing OpenAI
