import type { Metadata } from "next";
import Link from "next/link";

import { EmployeeInviteForm } from "@/components/employees/employee-invite-form";
import { cancelInvitationAction } from "@/app/actions/employees";
import { DashboardShell } from "@/components/dashboard-shell";
import { ModulePageLayout } from "@/components/module-page-layout";
import { WidgetCard } from "@/components/widget-card";
import { WorkspaceCard } from "@/components/workspace-card";
import { getEmployeesDashboard } from "@/lib/api";
import type { StaffDashboardResponse, StaffMembershipRecord } from "@/lib/types";

export const metadata: Metadata = {
  title: "Сотрудники",
};

type EmployeesPageProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

const emptyDashboard: StaffDashboardResponse = {
  company: { id: 0, name: "Компания", slug: "" },
  memberships: [],
  invitations: [],
  branches: [],
  stats: {
    total_members: 0,
    active_members: 0,
    admins: 0,
    pending_invites: 0,
  },
};

const roleLabels: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  manager: "Менеджер",
  employee: "Сотрудник",
};

const rolePills: Record<string, string> = {
  owner: "bg-[#dbeafe] text-[#1d4ed8]",
  admin: "bg-[#e9d5ff] text-[#7c3aed]",
  manager: "bg-[#dcfce7] text-[#15803d]",
  employee: "bg-[#f3f4f6] text-[#4b5563]",
};

const statusPills: Record<string, string> = {
  pending: "bg-[#fff7ed] text-[#c2410c]",
  accepted: "bg-[#ecfdf5] text-[#047857]",
  cancelled: "bg-[#f3f4f6] text-[#6b7280]",
  expired: "bg-[#fee2e2] text-[#b91c1c]",
};

function formatLastActivity(membership: StaffMembershipRecord) {
  return membership.last_login
    ? new Date(membership.last_login).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Не входил";
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const params = await searchParams;
  const search = params.search?.trim() ?? "";

  let dashboard = emptyDashboard;

  try {
    dashboard = await getEmployeesDashboard(undefined, search || undefined);
  } catch {
    dashboard = emptyDashboard;
  }

  const pendingInvitations = dashboard.invitations.filter((item) => item.status === "pending");

  return (
    <DashboardShell>
      <ModulePageLayout
        sidebar={
          <>
            <WidgetCard title="Компания" className="bg-white">
              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">Организация</span>
                  <span className="font-semibold text-[var(--text)]">{dashboard.company.name}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">Сотрудников</span>
                  <span className="font-semibold text-[var(--text)]">{dashboard.stats.total_members}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">Активных</span>
                  <span className="font-semibold text-[var(--text)]">{dashboard.stats.active_members}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">Приглашений</span>
                  <span className="font-semibold text-[var(--text)]">{dashboard.stats.pending_invites}</span>
                </div>
              </div>
            </WidgetCard>

            <div id="invite">
              <WidgetCard
                title="Пригласить"
                action={
                  <Link href="#invite" className="text-[12px] font-medium text-[var(--accent-strong)] hover:underline">
                    К форме
                  </Link>
                }
                className="bg-white"
              >
                <EmployeeInviteForm branches={dashboard.branches} />
              </WidgetCard>
            </div>

            <WidgetCard title="Доступы" className="bg-white">
              <p className="text-[13px] leading-6 text-[var(--muted)]">
                Роли, филиалы и карточки сотрудников настраиваются в этом разделе. Для системных
                доступов используйте настройки компании.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/dashboard/settings?section=employees" className="bitrix-link text-[13px] font-medium">
                  Открыть настройки
                </Link>
                <a
                  href="http://127.0.0.1:8000/admin/accounts/companymembership/"
                  target="_blank"
                  rel="noreferrer"
                  className="bitrix-link text-[13px] font-medium"
                >
                  Админка доступов
                </a>
              </div>
            </WidgetCard>
          </>
        }
      >
        <WorkspaceCard className="crm-workspace-card min-w-0 overflow-hidden">
          <div className="border-b border-[var(--line)] bg-[linear-gradient(180deg,#2b71bf_0%,#1f5e9e_100%)] px-5 py-5 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  Поиск сотрудника
                </p>
                <h1 className="mt-2 text-[30px] font-semibold leading-none">Сотрудники</h1>
                <p className="mt-3 max-w-3xl text-[13px] leading-6 text-white/75">
                  Приглашайте сотрудников, назначайте роли и филиалы, управляйте доступом в одном
                  рабочем экране в стиле Bitrix24.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="#invite"
                  className="inline-flex items-center gap-2 rounded-full bg-[#27c56c] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#1fb15f]"
                >
                  + Пригласить
                </Link>
                <Link
                  href="/dashboard/settings?section=employees"
                  className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-white/15"
                >
                  Настройки
                </Link>
              </div>
            </div>

            <form method="get" className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex min-w-[280px] flex-1 items-center rounded-full border border-white/15 bg-white/10 px-4 py-2.5 shadow-inner shadow-black/5 backdrop-blur">
                <input
                  name="search"
                  defaultValue={search}
                  placeholder="Поиск сотрудника"
                  className="w-full border-0 bg-transparent text-[14px] text-white placeholder:text-white/60 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1f5e9e] transition hover:bg-white/90"
              >
                Найти
              </button>
              {search ? (
                <Link
                  href="/dashboard/employees"
                  className="rounded-full border border-white/20 px-4 py-2.5 text-[13px] font-medium text-white/85 hover:bg-white/10"
                >
                  Сбросить
                </Link>
              ) : null}
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-[13px] text-white/85">
                В компании
              </span>
            </form>
          </div>

          <div className="border-b border-[var(--line)] bg-[var(--panel-muted)] px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Всего сотрудников</p>
                <p className="mt-1 text-[26px] font-semibold text-[var(--text)]">
                  {dashboard.stats.total_members}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Активные</p>
                <p className="mt-1 text-[26px] font-semibold text-[var(--text)]">
                  {dashboard.stats.active_members}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Руководители</p>
                <p className="mt-1 text-[26px] font-semibold text-[var(--text)]">
                  {dashboard.stats.admins}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Ожидают приглашения</p>
                <p className="mt-1 text-[26px] font-semibold text-[var(--text)]">
                  {dashboard.stats.pending_invites}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-[13px]">
              <thead className="border-b border-[var(--line)] bg-[var(--panel-muted)] text-[12px] uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Сотрудник</th>
                  <th className="px-4 py-3 font-medium">Подразделение</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Мобильный телефон</th>
                  <th className="px-4 py-3 font-medium">Дата последней активности</th>
                  <th className="px-4 py-3 font-medium">Мобильное приложение</th>
                  <th className="px-4 py-3 font-medium">Приложение для ПК</th>
                  <th className="px-4 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {dashboard.memberships.length > 0 ? (
                  dashboard.memberships.map((membership) => (
                    <tr key={membership.id} className="hover:bg-[#f8fbfe]">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--text)]">{membership.display_name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px]">
                          <span
                            className={`rounded-full px-2.5 py-1 font-semibold ${rolePills[membership.role] ?? rolePills.employee}`}
                          >
                            {roleLabels[membership.role] ?? membership.role}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 font-semibold ${membership.is_active ? "bg-[#ecfdf5] text-[#047857]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>
                            {membership.is_active ? "Активен" : "Неактивен"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {membership.branch_name || "Без филиала"}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{membership.email}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">—</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{formatLastActivity(membership)}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">Не установлено</td>
                      <td className="px-4 py-3 text-[var(--muted)]">Не установлено</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/employees/${membership.id}`}
                          className="rounded-full bg-[#eef4fb] px-3 py-1.5 text-[12px] font-semibold text-[#1f5e9e] hover:bg-[#dce9f8]"
                        >
                          Настроить
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-[13px] text-[var(--muted)]" colSpan={8}>
                      {search ? "Сотрудники не найдены." : "Пока нет сотрудников. Пригласите первого."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[var(--line)] bg-[var(--panel-muted)] px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--text)]">Приглашения</h2>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  Отправленные приглашения и их текущий статус.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--muted)]">
                {pendingInvitations.length} ожидают
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {dashboard.invitations.length > 0 ? (
                dashboard.invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[var(--text)]">
                          {invitation.full_name || invitation.email}
                        </div>
                        <div className="mt-1 text-[13px] text-[var(--muted)]">{invitation.email}</div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          statusPills[invitation.status] ?? "bg-[#f3f4f6] text-[#6b7280]"
                        }`}
                      >
                        {invitation.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                      <span className="rounded-full bg-[#f8fafc] px-2.5 py-1 text-[var(--muted)]">
                        {roleLabels[invitation.role] ?? invitation.role}
                      </span>
                      <span className="rounded-full bg-[#f8fafc] px-2.5 py-1 text-[var(--muted)]">
                        {invitation.branch_name || "Без филиала"}
                      </span>
                    </div>
                    {invitation.message ? (
                      <p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">{invitation.message}</p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={invitation.invite_url}
                        className="rounded-full bg-[#eef4fb] px-3 py-1.5 text-[12px] font-semibold text-[#1f5e9e] hover:bg-[#dce9f8]"
                      >
                        Открыть ссылку
                      </a>
                      <Link
                        href="/dashboard/settings?section=employees"
                        className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text)] hover:bg-[#f8fbfe]"
                      >
                        Настройка
                      </Link>
                      {invitation.status === "pending" ? (
                        <form action={cancelInvitationAction.bind(null, invitation.id)}>
                          <button
                            type="submit"
                            className="rounded-full border border-[#f5b5b5] bg-[#fff5f5] px-3 py-1.5 text-[12px] font-semibold text-[#c2410c] hover:bg-[#feecec]"
                          >
                            Отменить
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white px-4 py-8 text-center text-[13px] text-[var(--muted)] lg:col-span-2">
                  Нет активных приглашений.
                </div>
              )}
            </div>
          </div>
        </WorkspaceCard>
      </ModulePageLayout>
    </DashboardShell>
  );
}
