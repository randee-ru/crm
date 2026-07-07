# Frontend

Frontend CRM Kit на Next.js (App Router).

## Что уже есть

| Экран | Путь |
|-------|------|
| Лендинг | `/` |
| Вход | `/login` |
| CRM dashboard | `/dashboard` — канбан сделок / список клиентов |
| Клиенты | `/dashboard/clients/*` |
| Задачи | `/dashboard/tasks/*` |
| Расписание | `/dashboard/schedule` |
| Профиль | `/dashboard/profile` |
| Настройки | `/dashboard/settings` — инструменты, воронки CRM |

## CRM Kanban

- Колонки канбана загружаются из API (`getPipelines`)
- Переключение воронки: `?view=kanban&pipeline=1`
- Drag-and-drop → `updateDealStageAction(dealId, stageId)`

Компоненты:

- `components/crm-kanban-board.tsx`
- `components/crm-funnel-select.tsx`
- `components/crm-module-header.tsx`

Урок: [`docs/lessons/21-real-example-fitness-kanban-pipelines.md`](../docs/lessons/21-real-example-fitness-kanban-pipelines.md)

## Запуск

```bash
cd frontend
npm run dev
```

`npm run dev` очищает кэш `.next` и не конфликтует со старыми процессами.

## Переменные окружения

Скопируйте `.env.example` → `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Структура

```
frontend/
├── app/
│   ├── dashboard/       страницы CRM
│   ├── actions/         server actions (deals, clients, profile)
│   └── login/
├── components/          UI-компоненты
├── lib/
│   ├── api.ts           HTTP-клиент к backend
│   ├── types.ts         TypeScript-типы API
│   └── nav.ts           навигация sidebar
└── scripts/
    ├── dev-safe.sh      безопасный dev
    └── build-safe.sh    build без конфликта с dev
```

## Частые проблемы

**404 на `main-app.js`, `app-pages-internals.js` или шрифтах `.woff2`**

Причина: несколько `next dev` на порту 3000 или битый кэш `.next` (часто после `npm run build` при работающем dev).

1. Остановите все dev-серверы: `pkill -f "next dev"` или Ctrl+C в терминале
2. Запустите заново: `npm run dev`
3. В браузере: **Cmd + Shift + R** (жёсткое обновление, без кэша)

**Internal Server Error / `Cannot find module './218.js'`**

1. Остановите все `next dev`
2. `npm run dev`
3. В браузере: `Cmd + Shift + R`

Не запускайте `npm run build` при работающем dev.

## API-слой

Чтение: `lib/api.ts` (`getClients`, `getPipelines`, `getDeals`…)

Запись: `app/actions/*.ts` + `revalidatePath`

Документация API: [`docs/api/`](../docs/api/)
