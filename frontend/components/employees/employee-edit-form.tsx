"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { updateEmployeeAction } from "@/app/actions/employees";
import { normalizeWorkspaceGroupId, workspaceGroupOptions } from "@/lib/access-groups";
import { formatRussianPhoneInput } from "@/lib/phone";
import type { ActionState, BranchOption, StaffMembershipRecord } from "@/lib/types";

type EmployeeEditFormProps = {
  membership: StaffMembershipRecord;
  branches: BranchOption[];
};

const initialState: ActionState = {};

export function EmployeeEditForm({ membership, branches }: EmployeeEditFormProps) {
  const router = useRouter();
  const action = updateEmployeeAction.bind(null, membership.id);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [phone, setPhone] = useState(() =>
    membership.phone ? formatRussianPhoneInput(membership.phone) : "",
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

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
          <input name="first_name" defaultValue={membership.first_name} required className="form-field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Фамилия</span>
          <input name="last_name" defaultValue={membership.last_name} required className="form-field" />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={membership.email}
            required
            className="form-field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Телефон</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(formatRussianPhoneInput(event.target.value))}
            placeholder="+7 (900) 000-00-00"
            className="form-field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Дата рождения</span>
          <input
            name="birth_date"
            type="date"
            defaultValue={membership.birth_date ?? ""}
            className="form-field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Группа</span>
          <select
            name="role"
            defaultValue={normalizeWorkspaceGroupId(membership.role) || "reception"}
            className="form-field"
          >
            {workspaceGroupOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--text)]">Филиал</span>
          <select name="branch_id" defaultValue={membership.branch_id ?? ""} className="form-field">
            <option value="">Без филиала</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-[13px] text-[var(--text)]">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={membership.is_active}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Сотрудник активен
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          {isPending ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
