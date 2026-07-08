"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteMembershipsBulkAction } from "@/app/actions/memberships";
import { formatDateTime, membershipStatusLabels } from "@/lib/api";
import type { MembershipRecord } from "@/lib/types";

const statusPills: Record<string, string> = {
  active: "bg-[#ecfdf5] text-[#047857]",
  frozen: "bg-[#fff7ed] text-[#c2410c]",
  expired: "bg-[#fee2e2] text-[#b91c1c]",
  cancelled: "bg-[#f3f4f6] text-[#6b7280]",
  draft: "bg-[#eff6ff] text-[#1d4ed8]",
};

function formatMoney(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return value;
  }
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(number);
}

function statusLabel(status: string) {
  return membershipStatusLabels[status] ?? status;
}

type MembershipsTableProps = {
  memberships: MembershipRecord[];
  hasFilters: boolean;
};

export function MembershipsTable({ memberships, hasFilters }: MembershipsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const allIds = useMemo(() => memberships.map((item) => item.id), [memberships]);
  const allSelected = memberships.length > 0 && selectedIds.length === memberships.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  function toggleOne(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : allIds);
  }

  function handleBulkDelete() {
    if (selectedIds.length === 0) {
      return;
    }
    const count = selectedIds.length;
    if (!window.confirm(`Удалить выбранные абонементы (${count})?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteMembershipsBulkAction(selectedIds);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(result.success ?? "Абонементы удалены.");
      setSelectedIds([]);
      router.refresh();
    });
  }

  if (memberships.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[13px] text-[var(--muted)]">
        {hasFilters ? (
          <>По текущему фильтру абонементы не найдены.</>
        ) : (
          <>
            Абонементов пока нет.{" "}
            <Link href="/dashboard/memberships/new" className="text-[var(--accent-strong)] hover:underline">
              Создать первый
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {selectedIds.length > 0 ? (
        <div className="memberships-bulk-bar">
          <span>
            Выбрано: <strong>{selectedIds.length}</strong>
          </span>
          <button type="button" className="memberships-bulk-delete" disabled={isPending} onClick={handleBulkDelete}>
            {isPending ? "Удаление…" : "Удалить выбранные"}
          </button>
          <button
            type="button"
            className="memberships-bulk-clear"
            disabled={isPending}
            onClick={() => setSelectedIds([])}
          >
            Снять выделение
          </button>
        </div>
      ) : null}

      {message ? <p className="memberships-bulk-message">{message}</p> : null}

      <div className="overflow-x-auto bg-white">
        <table className="min-w-full text-left text-[13px]">
          <thead className="border-b border-[var(--line)] bg-[var(--panel-muted)] text-[12px] uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  className="tasks-checkbox"
                  aria-label="Выбрать все"
                  checked={allSelected}
                  ref={(node) => {
                    if (node) {
                      node.indeterminate = someSelected;
                    }
                  }}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3 font-medium">Абонемент</th>
              <th className="px-4 py-3 font-medium">Клиент</th>
              <th className="px-4 py-3 font-medium">Филиал</th>
              <th className="px-4 py-3 font-medium">Срок</th>
              <th className="px-4 py-3 font-medium">Посещения</th>
              <th className="px-4 py-3 font-medium">Цена</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Изменён</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {memberships.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <tr key={item.id} className={isSelected ? "memberships-row--selected" : "hover:bg-[#f8fbfe]"}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="tasks-checkbox"
                      aria-label={`Выбрать «${item.title}»`}
                      checked={isSelected}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/memberships/${item.id}`}
                      className="font-semibold text-[var(--text)] hover:text-[var(--accent-strong)]"
                    >
                      {item.title}
                    </Link>
                    {item.notes ? <div className="text-[12px] text-[var(--muted)]">{item.notes}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text)]">{item.client_name}</div>
                    <div className="text-[12px] text-[var(--muted)]">{item.client_phone}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{item.branch_name || "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    <div>{item.starts_at}</div>
                    <div>{item.ends_at}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {item.visit_limit === null ? "Без лимита" : `${item.visits_used} / ${item.visit_limit}`}
                    <div className="text-[12px] text-[var(--muted)]">
                      Осталось: {item.remaining_visits === null ? "∞" : item.remaining_visits}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatMoney(item.price)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusPills[item.status] ?? statusPills.draft}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatDateTime(item.updated_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
