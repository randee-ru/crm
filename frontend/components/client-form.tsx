"use client";

import { useActionState } from "react";

import { createClientAction, updateClientAction } from "@/app/actions/clients";
import type { ActionState, BranchOption, ClientDetail } from "@/lib/types";

type ClientFormProps = {
  branches: BranchOption[];
  client?: ClientDetail;
  mode: "create" | "edit";
};

const initialState: ActionState = {};

export function ClientForm({ branches, client, mode }: ClientFormProps) {
  const action = mode === "create" ? createClientAction : updateClientAction.bind(null, client!.id);
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

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Имя</span>
          <input
            name="first_name"
            defaultValue={client?.first_name ?? ""}
            required
            className="form-field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Фамилия</span>
          <input
            name="last_name"
            defaultValue={client?.last_name ?? ""}
            required
            className="form-field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Телефон</span>
          <input
            name="phone"
            defaultValue={client?.phone ?? ""}
            required
            className="form-field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={client?.email ?? ""}
            className="form-field"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Филиал</span>
          <select
            name="branch_id"
            defaultValue={client?.branch_id ?? ""}
            className="form-field"
          >
            <option value="">Без филиала</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Комментарий</span>
          <textarea
            name="notes"
            defaultValue={client?.notes ?? ""}
            rows={4}
            className="form-field"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-[13px] text-[var(--text)]">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={client?.is_active ?? true}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Клиент активен
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          {isPending ? "Сохранение..." : mode === "create" ? "Создать клиента" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
