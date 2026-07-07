"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createTrainerAction, updateTrainerAction } from "@/app/actions/trainers";
import type { ActionState, BranchOption, TrainerDetail } from "@/lib/types";

type TrainerFormProps = {
  branches: BranchOption[];
  trainer?: TrainerDetail;
  submitLabel?: string;
};

const initialState: ActionState = {};

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function TrainerForm({ branches, trainer, submitLabel }: TrainerFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const action = trainer ? updateTrainerAction.bind(null, trainer.id) : createTrainerAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const previewSrc = photoPreview ?? trainer?.photo_url ?? null;

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

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)]/10 text-[16px] font-semibold text-[var(--accent-strong)] ring-1 ring-[var(--line)] transition hover:ring-[var(--accent)]"
        >
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="Фото тренера" className="h-full w-full object-cover" />
          ) : (
            initials(trainer?.full_name || "Тренер") || "?"
          )}
        </button>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[13px] font-medium text-[var(--accent-strong)] hover:underline"
          >
            Загрузить фото
          </button>
          <p className="text-[12px] text-[var(--muted)]">JPG или PNG, до 3 МБ</p>
        </div>
        <input
          ref={fileInputRef}
          name="photo"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (photoPreview) {
              URL.revokeObjectURL(photoPreview);
            }
            setPhotoPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
      </div>

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

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Заслуги и регалии</span>
        <textarea
          name="achievements"
          defaultValue={trainer?.achievements ?? ""}
          rows={2}
          className="form-field resize-y"
          placeholder="МСМК по пауэрлифтингу, чемпион России 2022"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Описание</span>
        <textarea
          name="bio"
          defaultValue={trainer?.bio ?? ""}
          rows={4}
          className="form-field resize-y"
          placeholder="Публичное описание тренера — попадёт на сайт и в приложение"
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
