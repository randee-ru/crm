"use client";

import { useActionState } from "react";

import { acceptInvitationAction, type AcceptInviteState } from "@/app/actions/auth";

type InviteAcceptFormProps = {
  token: string;
  email?: string;
};

const initialState: AcceptInviteState = {};

export function InviteAcceptForm({ token, email }: InviteAcceptFormProps) {
  const [state, formAction, isPending] = useActionState(acceptInvitationAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />

      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        {email ? `Приглашение для ${email}` : "Примите приглашение и создайте доступ в CRM Kit."}
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Имя</span>
        <input
          name="first_name"
          type="text"
          autoComplete="given-name"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[var(--accent)] focus:bg-white"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Фамилия</span>
        <input
          name="last_name"
          type="text"
          autoComplete="family-name"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[var(--accent)] focus:bg-white"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Пароль</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[var(--accent)] focus:bg-white"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Создание доступа..." : "Принять приглашение"}
      </button>
    </form>
  );
}
