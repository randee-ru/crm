import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard-shell";
import { ModulePageLayout } from "@/components/module-page-layout";
import { WidgetCard } from "@/components/widget-card";
import { WorkspaceCard } from "@/components/workspace-card";
import { getAnalyticsOverview, formatMoney } from "@/lib/api";
import type { AnalyticsOverviewResponse } from "@/lib/types";

export const metadata: Metadata = {
  title: "Отчёты и аналитика",
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-white px-4 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-[26px] font-semibold text-[var(--text)]">{value}</p>
      {hint ? <p className="mt-1 text-[12px] text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export default async function ReportsPage() {
  let overview: AnalyticsOverviewResponse;
  try {
    overview = await getAnalyticsOverview();
  } catch {
    overview = {
      generated_at: new Date().toISOString(),
      company: { id: 0, name: "Компания", slug: "" },
      range: { days: 30, start_date: "", end_date: "" },
      totals: {
        clients_total: 0,
        clients_active: 0,
        bookings: 0,
        attendances: 0,
        sales_amount: "0",
        payments_amount: "0",
        unread_notifications: 0,
      },
      series: [],
      top_sources: [],
    };
  }

  return (
    <DashboardShell>
      <ModulePageLayout
        sidebar={
          <>
            <WidgetCard title="Подсказка" className="bg-white">
              <p className="text-[13px] leading-6 text-[var(--muted)]">
                Это отдельный каркас аналитики. Сюда дальше можно добавить дашборды по продажам,
                посещаемости, источникам лидов, менеджерам и тренерам.
              </p>
            </WidgetCard>
          </>
        }
      >
        <WorkspaceCard className="min-w-0 flex-1 overflow-hidden">
          <div className="border-b border-[var(--line)] bg-[linear-gradient(180deg,#17497b_0%,#1f5e9e_100%)] px-5 py-5 text-white">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60">
              Отчёты и аналитика
            </p>
            <h1 className="mt-2 text-[30px] font-semibold leading-none">Дашборд CRM</h1>
            <p className="mt-3 max-w-3xl text-[13px] leading-6 text-white/75">
              Сводка по клиентам, бронированиям, посещениям, продажам и платежам за последние{" "}
              {overview.range.days} дней.
            </p>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Клиентов" value={overview.totals.clients_total} hint="Всего в компании" />
            <StatCard label="Активных" value={overview.totals.clients_active} hint="Текущие клиенты" />
            <StatCard label="Бронирований" value={overview.totals.bookings} hint="За период" />
            <StatCard
              label="Посещений"
              value={overview.totals.attendances}
              hint={`Непрочитанных уведомлений: ${overview.totals.unread_notifications}`}
            />
          </div>

          <div className="grid gap-4 px-5 pb-5 xl:grid-cols-2">
            <WidgetCard title="Финансы" className="bg-white">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
                  <p className="text-[12px] text-[var(--muted)]">Сумма продаж</p>
                  <p className="mt-2 text-[22px] font-semibold text-[var(--text)]">
                    {formatMoney(overview.totals.sales_amount)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
                  <p className="text-[12px] text-[var(--muted)]">Сумма платежей</p>
                  <p className="mt-2 text-[22px] font-semibold text-[var(--text)]">
                    {formatMoney(overview.totals.payments_amount)}
                  </p>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard title="Источники" className="bg-white">
              <div className="space-y-2">
                {overview.top_sources.length > 0 ? (
                  overview.top_sources.map((item) => (
                    <div
                      key={item.channel || "empty"}
                      className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3"
                    >
                      <span className="text-[13px] text-[var(--text)]">{item.channel || "Без канала"}</span>
                      <span className="text-[13px] font-semibold text-[var(--accent-strong)]">{item.total}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[13px] text-[var(--muted)]">Пока нет данных по источникам.</p>
                )}
              </div>
            </WidgetCard>
          </div>

          <div className="px-5 pb-5">
            <WidgetCard title="Серия за период" className="bg-white">
              <div className="overflow-hidden rounded-2xl border border-[var(--line)]">
                <table className="min-w-full divide-y divide-[var(--line)] text-left text-[13px]">
                  <thead className="bg-[var(--panel-muted)] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Дата</th>
                      <th className="px-4 py-3 font-semibold">Звонки</th>
                      <th className="px-4 py-3 font-semibold">Брони</th>
                      <th className="px-4 py-3 font-semibold">Посещения</th>
                      <th className="px-4 py-3 font-semibold">Продажи</th>
                      <th className="px-4 py-3 font-semibold">Платежи</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)] bg-white">
                    {overview.series.map((row) => (
                      <tr key={row.date}>
                        <td className="px-4 py-3 font-medium text-[var(--text)]">{row.date}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{row.calls}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{row.bookings}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{row.attendances}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{formatMoney(row.sales_amount)}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{formatMoney(row.payments_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WidgetCard>
          </div>
        </WorkspaceCard>
      </ModulePageLayout>
    </DashboardShell>
  );
}
