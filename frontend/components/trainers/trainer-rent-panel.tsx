"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createTrainerRentPaymentAction, deleteTrainerRentPaymentAction } from "@/app/actions/trainers";
import type { ActionState, TrainerRentPayment } from "@/lib/types";

type TrainerRentPanelProps = {
  trainerId: number;
  payments: TrainerRentPayment[];
  rentPaidCurrentMonth: boolean;
};

const initialState: ActionState = {};

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatPeriod(period: string) {
  const date = new Date(period);
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date);
}

function formatMoney(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(number);
}

export function TrainerRentPanel({ trainerId, payments, rentPaidCurrentMonth }: TrainerRentPanelProps) {
  const router = useRouter();
  const action = createTrainerRentPaymentAction.bind(null, trainerId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[var(--muted)]">Аренда за текущий месяц</span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            rentPaidCurrentMonth ? "bg-[#ecfdf5] text-[#047857]" : "bg-[#fef2f2] text-[#b91c1c]"
          }`}
        >
          {rentPaidCurrentMonth ? "Оплачена" : "Не оплачена"}
        </span>
      </div>

      <form ref={formRef} action={formAction} className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] p-3">
        {state.error ? (
          <div className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700">{state.error}</div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--muted)]">Месяц</span>
            <input name="period" type="month" defaultValue={currentMonthValue()} required className="form-field bg-white text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--muted)]">Сумма</span>
            <input name="amount" type="number" min="0" step="0.01" required placeholder="15000" className="form-field bg-white text-[13px]" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-[var(--muted)]">Комментарий</span>
          <input name="note" placeholder="Необязательно" className="form-field bg-white text-[13px]" />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-[var(--accent)] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          {isPending ? "Сохранение..." : "Отметить оплату"}
        </button>
      </form>

      <div className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)]">
        {payments.length > 0 ? (
          payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]">
              <div>
                <div className="font-medium capitalize text-[var(--text)]">{formatPeriod(payment.period)}</div>
                <div className="text-[12px] text-[var(--muted)]">{payment.note || "Без комментария"}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--text)]">{formatMoney(payment.amount)}</span>
                <form action={deleteTrainerRentPaymentAction.bind(null, trainerId, payment.id)}>
                  <button
                    type="submit"
                    className="text-[12px] text-[var(--muted)] hover:text-red-600"
                    aria-label="Удалить оплату"
                  >
                    ✕
                  </button>
                </form>
              </div>
            </div>
          ))
        ) : (
          <div className="px-3 py-4 text-center text-[12px] text-[var(--muted)]">Оплат аренды пока нет.</div>
        )}
      </div>
    </div>
  );
}
