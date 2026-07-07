"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createTrainerAction, updateTrainerAction } from "@/app/actions/trainers";
import type { ActionState, BranchOption, TrainerDetail } from "@/lib/types";

type TrainerFormProps = {
  branches: BranchOption[];
  trainer?: TrainerDetail;
  submitLabel?: string;
};

const initialState: ActionState = {};

export function TrainerForm({ branches, trainer, submitLabel }: TrainerFormProps) {
  const router = useRouter();
  const action = trainer ? updateTrainerAction.bind(null, trainer.id) : createTrainerAction;
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

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Имя</span>
          <input
            name="first_name"
            defaultValue={trainer?.first_name ?? ""}
            required
            className="form-field"
            placeholder="Анна"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Фамилия</span>
          <input
            name="last_name"
            defaultValue={trainer?.last_name ?? ""}
            required
            className="form-field"
            placeholder="Иванова"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Телефон</span>
          <input
            name="phone"
            defaultValue={trainer?.phone ?? ""}
            required
            className="form-field"
            placeholder="+79990000001"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={trainer?.email ?? ""}
            className="form-field"
            placeholder="trainer@club.ru"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Специализация</span>
        <input
          name="specialization"
          defaultValue={trainer?.specialization ?? ""}
          className="form-field"
          placeholder="Йога, силовые, пилатес"
        />
      </label>

      <div className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Тип работы</span>
        <div className="flex flex-wrap gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2.5">
          <label className="flex items-center gap-2 text-[13px] text-[var(--text)]">
            <input
              name="trains_gym_floor"
              type="checkbox"
              defaultChecked={trainer?.trains_gym_floor ?? false}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Тренажёрный зал
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[var(--text)]">
            <input
              name="trains_group_programs"
              type="checkbox"
              defaultChecked={trainer?.trains_group_programs ?? false}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Групповые программы
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Филиал</span>
          <select name="branch_id" defaultValue={trainer?.branch_id ?? ""} className="form-field">
            <option value="">Без филиала</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pt-5 text-[13px] text-[var(--text)]">
          <input
            name="is_active"
            type="checkbox"
            defaultChecked={trainer?.is_active ?? true}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Активен
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {isPending ? "Сохранение..." : submitLabel ?? (trainer ? "Сохранить тренера" : "Создать тренера")}
      </button>
    </form>
  );
}
