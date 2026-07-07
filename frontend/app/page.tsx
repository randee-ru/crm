import Link from "next/link";

import { AppsDownloadWidget } from "@/components/apps-download-widget";
import { DashboardShell } from "@/components/dashboard-shell";
import { FeedComposer } from "@/components/feed-composer";
import { ModulePageLayout } from "@/components/module-page-layout";
import { TasksProgressWidget } from "@/components/tasks-progress-widget";
import { WidgetCard } from "@/components/widget-card";
import { WorkspaceCard } from "@/components/workspace-card";
import {
  formatClientDate,
  getClientPathLabel,
  getClients,
  getCompanyContext,
  getMembershipDealLabel,
  getTasks,
} from "@/lib/api";

export default async function HomePage() {
  let clientsCount = 0;
  let activeMemberships = 0;
  let companyName = "Sportmax Fitness";
  let clients = [] as Awaited<ReturnType<typeof getClients>>;
  let tasks = [] as Awaited<ReturnType<typeof getTasks>>;

  try {
    const [company, clientRows, taskRows] = await Promise.all([
      getCompanyContext(),
      getClients(),
      getTasks(undefined, { due: "today" }),
    ]);
    clientsCount = company.clients_count;
    companyName = company.name;
    clients = clientRows;
    tasks = taskRows;
    activeMemberships = clientRows.filter((item) => item.membership_status === "active").length;
  } catch {
    clientsCount = 0;
    activeMemberships = 0;
    clients = [];
    tasks = [];
  }

  const featuredClient = clients[0];

  return (
    <DashboardShell>
      <ModulePageLayout
        sidebar={
          <>
            <TasksProgressWidget
              total={tasks.length}
              inProgress={tasks.filter((task) => task.status === "in_progress").length}
              done={tasks.filter((task) => task.status === "done").length}
            />
            <WidgetCard title="Пульс компании">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[var(--accent)] text-[13px] font-bold text-[var(--accent-strong)]">
                  {clientsCount > 0 ? Math.min(100, clientsCount * 12) : 0}%
                </div>
                <div className="text-[13px] text-[var(--muted)]">
                  <p>
                    <span className="font-semibold text-[var(--text)]">{clientsCount}</span> клиентов
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-[var(--text)]">{activeMemberships}</span>{" "}
                    активных абонементов
                  </p>
                </div>
              </div>
            </WidgetCard>
            <WidgetCard
              title="Мои задачи"
              action={
                <Link href="/dashboard/tasks" className="bitrix-link text-[12px]">
                  Все
                </Link>
              }
            >
              <div className="space-y-1 text-[13px]">
                {[
                  ["В работе", String(tasks.filter((t) => t.status === "in_progress").length)],
                  ["Новые", String(tasks.filter((t) => t.status === "new").length)],
                  ["Всего сегодня", String(tasks.length)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-1">
                    <span className="text-[var(--muted)]">{label}</span>
                    <span className="font-semibold text-[var(--text)]">{value}</span>
                  </div>
                ))}
              </div>
            </WidgetCard>
            <AppsDownloadWidget />
          </>
        }
      >
        <div className="space-y-3">
          <WorkspaceCard>
            <FeedComposer />
            <article className="px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dfe3e8] text-sm font-semibold text-[var(--muted)]">
                  АД
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-[var(--text)]">Admin User</span>
                    <span className="text-[12px] text-[var(--muted)]">сегодня</span>
                  </div>
                  <h2 className="mt-2 text-[18px] font-semibold leading-snug text-[var(--text)]">
                    Открыт корпоративный портал {companyName}
                  </h2>
                  <p className="mt-2 text-[13px] leading-6 text-[var(--text)]">
                    Добро пожаловать в CRM Kit. Здесь менеджеры ведут клиентов, задачи и расписание.
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
                    Клиентов: {clientsCount} · Абонементов: {activeMemberships} · Задач сегодня:{" "}
                    {tasks.length}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                    <span className="rounded bg-[var(--panel-muted)] px-2 py-1 text-[var(--muted)]">
                      Нравится
                    </span>
                    <span className="rounded bg-[var(--panel-muted)] px-2 py-1 text-[var(--muted)]">
                      Комментировать
                    </span>
                    <Link href="/dashboard" className="bitrix-link rounded bg-[var(--accent-soft)] px-2 py-1 font-medium">
                      Открыть CRM
                    </Link>
                  </div>
                </div>
              </div>
            </article>

            {featuredClient ? (
              <div className="border-t border-[var(--line)] px-4 py-3">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Последний клиент
                </p>
                <div className="rounded-md border border-[var(--line)] bg-[var(--panel-muted)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold text-[var(--text)]">
                        {featuredClient.full_name}
                      </p>
                      <p className="mt-0.5 text-[13px] text-[var(--muted)]">{featuredClient.phone}</p>
                      <p className="mt-1 text-[12px] text-[var(--muted)]">
                        {getClientPathLabel(featuredClient)}
                      </p>
                    </div>
                    <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)]">
                      {formatClientDate(featuredClient.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </WorkspaceCard>

          <WorkspaceCard>
            <div className="border-b border-[var(--line)] px-4 py-3">
              <h2 className="text-[15px] font-semibold text-[var(--text)]">Клиенты</h2>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {clients.length > 0 ? (
                clients.slice(0, 5).map((client) => (
                  <Link
                    key={client.id}
                    href={`/dashboard/clients/${client.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#f0f5f8]"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--text)]">{client.full_name}</p>
                      <p className="text-[12px] text-[var(--muted)]">{client.phone}</p>
                    </div>
                    <span className="text-[12px] text-[var(--muted)]">
                      {getMembershipDealLabel(client)}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-[13px] text-[var(--muted)]">
                  Нет данных. Запустите backend и `seed_demo`.
                </p>
              )}
            </div>
          </WorkspaceCard>
        </div>
      </ModulePageLayout>
    </DashboardShell>
  );
}
