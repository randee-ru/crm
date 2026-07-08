import type { Metadata } from "next";
import Link from "next/link";

import { MembershipsModuleHeader } from "@/components/memberships/memberships-module-header";
import { MembershipsTable } from "@/components/memberships/memberships-table";
import { WorkspaceCard } from "@/components/workspace-card";
import { getMemberships } from "@/lib/api";
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

          <MembershipsTable memberships={memberships} hasFilters={Boolean(search || status)} />
        </WorkspaceCard>
      </div>
  );
}
