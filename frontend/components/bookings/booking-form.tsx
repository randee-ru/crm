"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createBookingAction, updateBookingAction } from "@/app/actions/bookings";
import type {
  ActionState,
  BookingDetail,
  BranchOption,
  ClientRecord,
  MembershipRecord,
  TrainerRecord,
} from "@/lib/types";

type BookingFormProps = {
  clients: ClientRecord[];
  trainers: TrainerRecord[];
  memberships: MembershipRecord[];
  branches: BranchOption[];
  booking?: BookingDetail;
  submitLabel?: string;
};

const initialState: ActionState = {};

const statusOptions = [
  { value: "draft", label: "Черновик" },
  { value: "confirmed", label: "Подтверждено" },
  { value: "completed", label: "Завершено" },
  { value: "cancelled", label: "Отменено" },
  { value: "no_show", label: "Не пришёл" },
] as const;

function toLocalDateTimeValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function BookingForm({
  clients,
  trainers,
  memberships,
  branches,
  booking,
  submitLabel,
}: BookingFormProps) {
  const router = useRouter();
  const action = booking
    ? updateBookingAction.bind(null, booking.id)
    : createBookingAction;
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
          defaultValue={booking?.title ?? ""}
          className="form-field"
          placeholder="Персональная тренировка"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Начало</span>
          <input
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={toLocalDateTimeValue(booking?.starts_at)}
            className="form-field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Окончание</span>
          <input
            name="ends_at"
            type="datetime-local"
            required
            defaultValue={toLocalDateTimeValue(booking?.ends_at)}
            className="form-field"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Статус</span>
          <select name="status" defaultValue={booking?.status ?? "draft"} className="form-field">
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Источник</span>
          <input name="source" defaultValue={booking?.source ?? ""} className="form-field" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Клиент</span>
          <select name="client_id" defaultValue={booking?.client_id ?? ""} className="form-field">
            <option value="">Без клиента</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Тренер</span>
          <select name="trainer_id" defaultValue={booking?.trainer_id ?? ""} className="form-field">
            <option value="">Без тренера</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.full_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Абонемент</span>
          <select name="membership_id" defaultValue={booking?.membership_id ?? ""} className="form-field">
            <option value="">Без абонемента</option>
            {memberships.map((membership) => (
              <option key={membership.id} value={membership.id}>
                {membership.title} · {membership.client_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Филиал</span>
          <select name="branch_id" defaultValue={booking?.branch_id ?? ""} className="form-field">
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
          defaultValue={booking?.notes ?? ""}
          className="form-field"
          placeholder="Комментарий к бронированию"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {isPending
          ? "Сохранение..."
          : submitLabel ?? (booking ? "Сохранить бронирование" : "Создать бронирование")}
      </button>
    </form>
  );
}
