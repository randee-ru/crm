"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { inviteEmployeeAction } from "@/app/actions/employees";
import type { ActionState, BranchOption } from "@/lib/types";

type EmployeeInviteFormProps = {
  branches: BranchOption[];
};

const initialState: ActionState = {};

const roleOptions = [
  { value: "employee", label: "Сотрудник" },
  { value: "manager", label: "Менеджер" },
  { value: "admin", label: "Администратор" },
  { value: "owner", label: "Владелец" },
] as const;

export function EmployeeInviteForm({ branches }: EmployeeInviteFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(inviteEmployeeAction, initialState);

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
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">ФИО</span>
        <input
          name="full_name"
          required
          placeholder="Иван Петров"
          className="form-field"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Email</span>
        <input
          name="email"
          type="email"
          required
          placeholder="ivan@club.ru"
          className="form-field"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Роль</span>
          <select name="role" defaultValue="employee" className="form-field">
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Филиал</span>
          <select name="branch_id" defaultValue="" className="form-field">
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
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Сообщение</span>
        <textarea
          name="message"
          rows={3}
          placeholder="Привет! Добавляем вас в CRM и доступы клуба."
          className="form-field"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {isPending ? "Отправка..." : "Пригласить сотрудника"}
      </button>
    </form>
  );
}
