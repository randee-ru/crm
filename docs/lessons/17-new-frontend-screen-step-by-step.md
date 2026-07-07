# Урок 17 — Новый экран frontend: пошагово

## Цель

Сделать рабочий UI: список → форма создания → редактирование, подключённый к API.

Эталон: модуль **клиентов** в `frontend/app/dashboard/clients/`.

## Слои frontend

```
types.ts          — форма данных (TypeScript)
lib/api.ts        — чтение (GET), server components
app/actions/      — запись (POST/PATCH), server actions
components/       — формы и таблицы (client components)
app/dashboard/    — страницы (server components)
lib/nav.ts        — пункты меню
```

## Шаг 1. Типы

`frontend/lib/types.ts`:

```typescript
export type TrainerRecord = {
  id: number;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
};

export type TrainerDetail = TrainerRecord & {
  updated_at: string;
};

export type TrainerWriteInput = {
  first_name: string;
  last_name: string;
  is_active?: boolean;
};
```

## Шаг 2. API-клиент (чтение)

`frontend/lib/api.ts` — функции для server components:

```typescript
export async function getTrainers(companySlug?: string): Promise<TrainerRecord[]> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const response = await fetch(
    `${API_BASE_URL}/api/v1/trainers/?company=${encodeURIComponent(slug)}`,
    { headers: await getAuthHeaders(), cache: "no-store" },
  );
  if (!response.ok) return [];
  return response.json();
}

export async function getTrainer(id: number, companySlug?: string): Promise<TrainerDetail | null> {
  const slug = companySlug ?? (await getCompanySlugFromCookie());
  const response = await fetch(
    `${API_BASE_URL}/api/v1/trainers/${id}/?company=${encodeURIComponent(slug)}`,
    { headers: await getAuthHeaders(), cache: "no-store" },
  );
  if (!response.ok) return null;
  return response.json();
}
```

Паттерн тот же, что у `getClients()` / `getClient()`.

## Шаг 3. Server actions (запись)

`frontend/app/actions/trainers.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { ActionState, TrainerWriteInput } from "@/lib/types";

// parseApiError — скопируйте из app/actions/clients.ts

export async function createTrainerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload: TrainerWriteInput = {
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    is_active: formData.get("is_active") === "on",
  };

  const response = await fetch(
    `${API_BASE_URL}/api/v1/trainers/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: { ...(await getAuthHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    return { error: "Не удалось создать тренера." };
  }

  revalidatePath("/dashboard/trainers");
  redirect("/dashboard/trainers");
}
```

## Шаг 4. Форма (client component)

`frontend/components/trainer-form.tsx` — копируйте `client-form.tsx`:

- `"use client"`
- `useActionState(action, initialState)`
- `<form action={formAction}>`
- поля с `name="..."` совпадают с FormData в action
- `state.error` / `state.success` для сообщений

## Шаг 5. Страницы

### Список — `app/dashboard/trainers/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getAuthSession } from "@/lib/auth";
import { getTrainers } from "@/lib/api";

export default async function TrainersPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const trainers = await getTrainers();

  return (
    <DashboardShell>
      {/* таблица trainers + ссылка на /dashboard/trainers/new */}
    </DashboardShell>
  );
}
```

### Создание — `app/dashboard/trainers/new/page.tsx`

Загружает справочники (если нужны), рендерит `<TrainerForm mode="create" />`.

### Редактирование — `app/dashboard/trainers/[id]/page.tsx`

`getTrainer(id)` + `<TrainerForm mode="edit" trainer={trainer} />`.

## Шаг 6. Навигация

`frontend/lib/nav.ts` — добавьте пункт в `workspaceNavigation`:

```typescript
{ id: "trainers", label: "Тренеры", href: "/dashboard/trainers", icon: "tasks" },
```

И включите `"trainers"` в `workspaceSidebarLayout`.

## Шаг 7. Оболочка страницы

Используйте готовые компоненты:

- `DashboardShell` — sidebar + header
- `ModulePageLayout` — сетка с виджетами
- `WorkspaceCard` + `CrmModuleHeader` — синяя шапка модуля
- `ClientsTable` как образец для таблицы

## Загрузка файлов

Если нужен файл (фото):

1. `FormData` в server action, **без** `Content-Type: application/json`.
2. Backend принимает `multipart/form-data`.
3. Пример: `frontend/app/actions/profile.ts`.

## Проверка

```bash
cd frontend
npm run dev
```

1. Откройте `/dashboard/trainers`
2. Создайте запись
3. Обновите страницу — запись на месте
4. `npm run build` — нет ошибок TypeScript

## Частые ошибки

| Симптом | Причина |
|---------|---------|
| 500 Application error | Backend не запущен или упал |
| Пустой список | Нет `?company=` или неверный slug |
| Форма не сохраняет | `name` поля не совпадает с FormData |
| 401 | Нет токена в cookie — залогиньтесь |

## Следующий шаг

→ [Чеклист](./18-developer-checklist.md)  
→ [Практика: абонементы](./19-practice-memberships-crud.md)
