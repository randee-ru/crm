"use client";

import { useActionState } from "react";

import { createTaskAction, updateTaskAction } from "@/app/actions/tasks";
import type { ActionState, ClientRecord, TaskDetail } from "@/lib/types";

type TaskFormProps = {
  clients: ClientRecord[];
  task?: TaskDetail;
  mode: "create" | "edit";
};

const initialState: ActionState = {};

function toLocalDateTimeValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function TaskForm({ clients, task, mode }: TaskFormProps) {
  const action = mode === "create" ? createTaskAction : updateTaskAction.bind(null, task!.id);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          {state.success}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Заголовок</span>
        <input
          name="title"
          defaultValue={task?.title ?? ""}
          required
          className="w-full rounded border border-[var(--line)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Описание</span>
        <textarea
          name="description"
          defaultValue={task?.description ?? ""}
          rows={4}
          className="w-full rounded border border-[var(--line)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Статус</span>
          <select
            name="status"
            defaultValue={task?.status ?? "open"}
            className="w-full rounded border border-[var(--line)] bg-white px-3 py-2 text-[13px]"
          >
            <option value="open">Открыта</option>
            <option value="in_progress">В работе</option>
            <option value="done">Выполнена</option>
            <option value="cancelled">Отменена</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Приоритет</span>
          <select
            name="priority"
            defaultValue={task?.priority ?? "normal"}
            className="w-full rounded border border-[var(--line)] bg-white px-3 py-2 text-[13px]"
          >
            <option value="low">Низкий</option>
            <option value="normal">Обычный</option>
            <option value="high">Высокий</option>
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Срок</span>
          <input
            name="due_at"
            type="datetime-local"
            defaultValue={toLocalDateTimeValue(task?.due_at)}
            className="w-full rounded border border-[var(--line)] bg-white px-3 py-2 text-[13px]"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Клиент</span>
          <select
            name="client_id"
            defaultValue={task?.client_id ?? ""}
            className="w-full rounded border border-[var(--line)] bg-white px-3 py-2 text-[13px]"
          >
            <option value="">Без клиента</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {isPending ? "Сохранение..." : mode === "create" ? "Создать задачу" : "Сохранить"}
      </button>
    </form>
  );
}
