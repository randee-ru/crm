"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createAttendanceAction, updateAttendanceAction } from "@/app/actions/attendance";
import type {
  ActionState,
  AttendanceDetail,
  BookingRecord,
  BranchOption,
  ClientRecord,
  MembershipRecord,
  TrainerRecord,
} from "@/lib/types";

type AttendanceFormProps = {
  clients: ClientRecord[];
  trainers: TrainerRecord[];
  memberships: MembershipRecord[];
  bookings: BookingRecord[];
  branches: BranchOption[];
  attendance?: AttendanceDetail;
  submitLabel?: string;
};

const initialState: ActionState = {};

const statusOptions = [
  { value: "checked_in", label: "Пришёл" },
  { value: "late", label: "Опоздал" },
  { value: "no_show", label: "Не пришёл" },
  { value: "cancelled", label: "Отменено" },
] as const;

function toLocalDateTimeValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function AttendanceForm({
  clients,
  trainers,
  memberships,
  bookings,
  branches,
  attendance,
  submitLabel,
}: AttendanceFormProps) {
  const router = useRouter();
  const action = attendance
    ? updateAttendanceAction.bind(null, attendance.id)
    : createAttendanceAction;
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
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Статус</span>
          <select name="status" defaultValue={attendance?.status ?? "checked_in"} className="form-field">
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Клиент</span>
          <select name="client_id" defaultValue={attendance?.client_id ?? ""} className="form-field">
            <option value="">Выберите клиента</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Вход</span>
          <input
            name="checked_in_at"
            type="datetime-local"
            required
            defaultValue={toLocalDateTimeValue(attendance?.checked_in_at)}
            className="form-field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Выход</span>
          <input
            name="checked_out_at"
            type="datetime-local"
            defaultValue={toLocalDateTimeValue(attendance?.checked_out_at)}
            className="form-field"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Абонемент</span>
          <select
            name="membership_id"
            defaultValue={attendance?.membership_id ?? ""}
            className="form-field"
          >
            <option value="">Без абонемента</option>
            {memberships.map((membership) => (
              <option key={membership.id} value={membership.id}>
                {membership.title} · {membership.client_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Бронирование</span>
          <select name="booking_id" defaultValue={attendance?.booking_id ?? ""} className="form-field">
            <option value="">Без бронирования</option>
            {bookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.title} · {booking.client_name || "—"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Тренер</span>
          <select name="trainer_id" defaultValue={attendance?.trainer_id ?? ""} className="form-field">
            <option value="">Без тренера</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Филиал</span>
          <select name="branch_id" defaultValue={attendance?.branch_id ?? ""} className="form-field">
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
          defaultValue={attendance?.notes ?? ""}
          className="form-field"
          placeholder="Комментарий к посещению"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {isPending
          ? "Сохранение..."
          : submitLabel ?? (attendance ? "Сохранить посещение" : "Создать посещение")}
      </button>
    </form>
  );
}
