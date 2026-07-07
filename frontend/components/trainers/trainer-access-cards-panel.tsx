"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createTrainerAccessCardAction,
  deleteTrainerAccessCardAction,
  updateTrainerAccessCardStatusAction,
} from "@/app/actions/trainers";
import { IconIdCard } from "@/components/ui/app-icon";
import type { ActionState, TrainerAccessCard } from "@/lib/types";

type TrainerAccessCardsPanelProps = {
  trainerId: number;
  cards: TrainerAccessCard[];
};

const initialState: ActionState = {};

const statusClass: Record<string, string> = {
  active: "bg-[#ecfdf5] text-[#047857]",
  blocked: "bg-[#fef2f2] text-[#b91c1c]",
  lost: "bg-[#fff7ed] text-[#c2410c]",
};

export function TrainerAccessCardsPanel({ trainerId, cards }: TrainerAccessCardsPanelProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const action = createTrainerAccessCardAction.bind(null, trainerId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setShowForm(false);
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <section className="client-card-section">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="!mb-0">Карты</h2>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="text-[12px] font-medium text-[var(--accent-strong)] hover:underline"
        >
          {showForm ? "Отмена" : "+ Выдать карту"}
        </button>
      </div>

      {showForm ? (
        <form ref={formRef} action={formAction} className="mb-3 space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] p-3">
          {state.error ? (
            <div className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700">{state.error}</div>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--muted)]">Номер карты</span>
            <input
              name="card_number"
              required
              placeholder="125,63260"
              className="form-field bg-white text-[13px]"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded bg-[var(--accent)] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
          >
            {isPending ? "Сохранение..." : "Выдать карту"}
          </button>
        </form>
      ) : null}

      {cards.length > 0 ? (
        <div className="space-y-2">
          {cards.map((card) => (
            <div key={card.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] px-3 py-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded border border-[var(--line)] bg-[var(--panel-muted)] text-[var(--muted)]">
                  <IconIdCard size={16} />
                </span>
                <div>
                  <div className="text-[13px] font-medium text-[var(--accent-strong)] underline decoration-dotted">
                    Карта №{card.card_number}
                  </div>
                  {card.status !== "active" ? (
                    <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass[card.status] ?? ""}`}>
                      {card.status_label}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {card.status === "active" ? (
                  <button
                    type="button"
                    className="text-[11px] text-[var(--muted)] hover:text-[#b91c1c]"
                    onClick={() => {
                      updateTrainerAccessCardStatusAction(trainerId, card.id, "blocked").then(() => router.refresh());
                    }}
                  >
                    Заблокировать
                  </button>
                ) : null}
                <form action={deleteTrainerAccessCardAction.bind(null, trainerId, card.id)}>
                  <button type="submit" className="text-[12px] text-[var(--muted)] hover:text-red-600" aria-label="Удалить карту">
                    ✕
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-[var(--muted)]">Карта не выдана.</p>
      )}
    </section>
  );
}
