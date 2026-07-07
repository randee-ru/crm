"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createMembershipAction, updateMembershipAction } from "@/app/actions/memberships";
import type { ActionState, BranchOption, ClientRecord, MembershipRecord } from "@/lib/types";

type MembershipFormProps = {
  clients: ClientRecord[];
  branches: BranchOption[];
  membership?: MembershipRecord;
  submitLabel?: string;
};

const initialState: ActionState = {};

const statusOptions = [
  { value: "draft", label: "Черновик" },
  { value: "active", label: "Активен" },
  { value: "frozen", label: "Заморожен" },
  { value: "expired", label: "Истёк" },
  { value: "cancelled", label: "Отменён" },
] as const;

function toDateInput(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function MembershipForm({
  clients,
  branches,
  membership,
  submitLabel,
}: MembershipFormProps) {
  const router = useRouter();
  const action = membership
    ? updateMembershipAction.bind(null, membership.id)
    : createMembershipAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-3">
      {state.error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
          {state.success}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Название</span>
        <input
          name="title"
          required
          defaultValue={membership?.title ?? ""}
          className="form-field"
          placeholder="Пробный месяц"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Клиент</span>
          <select name="client_id" defaultValue={membership?.client_id ?? ""} className="form-field">
            <option value="">Выберите клиента</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Статус</span>
          <select name="status" defaultValue={membership?.status ?? "draft"} className="form-field">
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Начало</span>
          <input
            name="starts_at"
            type="date"
            required
            defaultValue={toDateInput(membership?.starts_at)}
            className="form-field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Окончание</span>
          <input
            name="ends_at"
            type="date"
            required
            defaultValue={toDateInput(membership?.ends_at)}
            className="form-field"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Лимит посещений</span>
          <input
            name="visit_limit"
            type="number"
            min={1}
            defaultValue={membership?.visit_limit ?? ""}
            className="form-field"
            placeholder="12"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Использовано</span>
          <input
            name="visits_used"
            type="number"
            min={0}
            defaultValue={membership?.visits_used ?? 0}
            className="form-field"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Цена</span>
          <input
            name="price"
            type="number"
            min={0}
            step="1"
            defaultValue={membership?.price ?? 0}
            className="form-field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Филиал</span>
          <select name="branch_id" defaultValue={membership?.branch_id ?? ""} className="form-field">
            <option value="">Без филиала</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Комментарий</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={membership?.notes ?? ""}
          className="form-field"
          placeholder="Условия абонемента"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {isPending
          ? "Сохранение..."
          : submitLabel ?? (membership ? "Сохранить абонемент" : "Создать абонемент")}
      </button>
    </form>
  );
}
