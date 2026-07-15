"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createEmployeeAction, inviteEmployeeAction } from "@/app/actions/employees";
import { workspaceGroupOptions } from "@/lib/access-groups";
import { formatRussianPhoneInput } from "@/lib/phone";
import type { ActionState, BranchOption } from "@/lib/types";

type EmployeeCreateFormProps = {
  branches: BranchOption[];
};

const initialState: ActionState = {};

function RoleAndBranchFields({ branches }: { branches: BranchOption[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Группа</span>
        <select name="role" defaultValue="reception" className="form-field">
          {workspaceGroupOptions.map((option) => (
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
  );
}

function InviteForm({ branches }: { branches: BranchOption[] }) {
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
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{state.error}</div>
      ) : null}
      {state.success ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
          {state.success}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">ФИО</span>
        <input name="full_name" required placeholder="Иван Петров" className="form-field" />
      </label>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Email</span>
        <input name="email" type="email" required placeholder="ivan@club.ru" className="form-field" />
      </label>

      <RoleAndBranchFields branches={branches} />

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
        {isPending ? "Отправка..." : "Отправить приглашение"}
      </button>
    </form>
  );
}

function DirectCreateForm({ branches }: { branches: BranchOption[] }) {
  const [state, formAction, isPending] = useActionState(createEmployeeAction, initialState);
  const [phone, setPhone] = useState("");

  return (
    <form action={formAction} className="space-y-3">
      {state.error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{state.error}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Имя</span>
          <input name="first_name" required placeholder="Ольга" className="form-field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Фамилия</span>
          <input name="last_name" required placeholder="Ресепшн" className="form-field" />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Email (логин)</span>
        <input name="email" type="email" required placeholder="olga@club.ru" className="form-field" />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Телефон</span>
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
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Дата рождения</span>
          <input name="birth_date" type="date" className="form-field" />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Пароль</span>
        <input
          name="password"
          type="text"
          required
          minLength={8}
          placeholder="Минимум 8 символов"
          className="form-field"
        />
        <span className="mt-1 block text-[11px] text-[var(--muted)]">
          Сотрудник сможет войти сразу, без письма-приглашения. Пароль лучше сообщить лично.
        </span>
      </label>

      <RoleAndBranchFields branches={branches} />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {isPending ? "Создание..." : "Создать сотрудника"}
      </button>
    </form>
  );
}

export function EmployeeCreateForm({ branches }: EmployeeCreateFormProps) {
  const [mode, setMode] = useState<"invite" | "direct">("invite");

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("invite")}
          className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
            mode === "invite" ? "bg-[var(--accent)] text-white" : "bg-[var(--panel-muted)] text-[var(--muted)] hover:bg-[#e9eef5]"
          }`}
        >
          Пригласить по email
        </button>
        <button
          type="button"
          onClick={() => setMode("direct")}
          className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
            mode === "direct" ? "bg-[var(--accent)] text-white" : "bg-[var(--panel-muted)] text-[var(--muted)] hover:bg-[#e9eef5]"
          }`}
        >
          Создать сразу
        </button>
      </div>

      {mode === "invite" ? <InviteForm branches={branches} /> : <DirectCreateForm branches={branches} />}
    </div>
  );
}
