import type { Metadata } from "next";
import Link from "next/link";

import { MembershipsModuleHeader } from "@/components/memberships/memberships-module-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspaceCard } from "@/components/workspace-card";
import { formatDateTime, getMemberships, membershipStatusLabels } from "@/lib/api";
import type { MembershipRecord } from "@/lib/types";

export const metadata: Metadata = { title: "Абонементы" };

type MembershipsPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
};

const statusOptions = [
  { value: "", label: "Все статусы" },
  { value: "draft", label: "Черновик" },
  { value: "active", label: "Активные" },
  { value: "frozen", label: "Замороженные" },
  { value: "expired", label: "Истёкшие" },
  { value: "cancelled", label: "Отменённые" },
] as const;

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

function countExpiringSoon(items: MembershipRecord[]) {
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  return items.filter((item) => {
    const endDate = new Date(item.ends_at);
    return item.status === "active" && endDate <= soon;
  }).length;
}

export default async function MembershipsPage({ searchParams }: MembershipsPageProps) {
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const status = params.status?.trim() ?? "";

  const memberships = await getMemberships(undefined, {
    search: search || undefined,
    status: status || undefined,
  }).catch(() => [] as MembershipRecord[]);

  const activeCount = memberships.filter((item) => item.status === "active").length;
  const frozenCount = memberships.filter((item) => item.status === "frozen").length;
  const expiringSoonCount = countExpiringSoon(memberships);

  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="clients-workspace-card min-w-0 flex-1">
          <MembershipsModuleHeader
            total={memberships.length}
            activeCount={activeCount}
            frozenCount={frozenCount}
            expiringSoonCount={expiringSoonCount}
          />

          <form
            method="get"
            className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-white px-4 py-3"
          >
            <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[13px] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/15">
              <span className="text-[var(--muted)]">⌕</span>
              <input
                name="search"
                defaultValue={search}
                placeholder="Название, клиент или телефон"
                className="w-full border-0 bg-transparent outline-none"
              />
            </label>

            <select
              name="status"
              defaultValue={status}
              className="form-field w-auto min-w-[150px] bg-white"
              aria-label="Статус абонемента"
            >
              {statusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-strong)]"
            >
              Найти
            </button>

            {search || status ? (
              <Link
                href="/dashboard/memberships"
                className="inline-flex items-center rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--panel-muted)]"
              >
                Сбросить
              </Link>
            ) : null}
          </form>

          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-[13px]">
              <thead className="border-b border-[var(--line)] bg-[var(--panel-muted)] text-[12px] uppercase tracking-wide text-[var(--muted)]">
                <tr>
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
                {memberships.length > 0 ? (
                  memberships.map((item) => (
                    <tr key={item.id} className="hover:bg-[#f8fbfe]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/memberships/${item.id}`}
                          className="font-semibold text-[var(--text)] hover:text-[var(--accent-strong)]"
                        >
                          {item.title}
                        </Link>
                        {item.notes ? (
                          <div className="text-[12px] text-[var(--muted)]">{item.notes}</div>
                        ) : null}
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
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-[13px] text-[var(--muted)]" colSpan={8}>
                      {search || status ? (
                        <>По текущему фильтру абонементы не найдены.</>
                      ) : (
                        <>
                          Абонементов пока нет.{" "}
                          <Link href="/dashboard/memberships/new" className="text-[var(--accent-strong)] hover:underline">
                            Создать первый
                          </Link>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </WorkspaceCard>
      </div>
    </DashboardShell>
  );
}
