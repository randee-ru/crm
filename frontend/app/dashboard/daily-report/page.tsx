import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentProps } from "react";

import { DashboardShell } from "@/components/dashboard-shell";
import { ModulePageLayout } from "@/components/module-page-layout";
import { WidgetCard } from "@/components/widget-card";
import { WorkspaceCard } from "@/components/workspace-card";
import { getDailyReport, formatMoney } from "@/lib/api";
import type { DailyReportMetrics, DailyReportResponse } from "@/lib/types";

export const metadata: Metadata = {
  title: "Дневной отчет",
};

type DailyReportPageProps = {
  searchParams: Promise<{
    date?: string;
  }>;
};

function getIsoDate(offsetDays = 0) {
  return new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function createEmptyReport(reportDate: string): DailyReportResponse {
  return {
    report_date: reportDate,
    generated_at: new Date().toISOString(),
    company: {
      id: 0,
      name: "Компания",
      slug: "",
    },
    metrics: {
      incoming_calls: 0,
      outgoing_calls: 0,
      outgoing_dialed_base: 0,
      total_calls: 0,
      telegram: 0,
      max: 0,
      whatsapp: 0,
      site_applications: 0,
      new_site_applications: 0,
      guest_visits: 0,
      day_sales: 0,
      day_sales_amount: "0",
      meetings_scheduled: 0,
      refusals: 0,
      renewals: 0,
      negative_result: 0,
      no_result: 0,
      cash_op: "0",
      reviews: 0,
    },
    source_notes: [],
    plan_items: [],
  };
}

const sections: {
  title: string;
  description: string;
  items: {
    key: keyof DailyReportMetrics;
    label: string;
    tone: string;
    format?: "money";
  }[];
}[] = [
  {
    title: "Связь",
    description: "Телефония и мессенджеры за выбранный день.",
    items: [
      { key: "incoming_calls", label: "Входящих звонков", tone: "bg-[#e8f4ff] text-[#2b7fd6]" },
      { key: "outgoing_calls", label: "Исходящих", tone: "bg-[#ecfdf5] text-[#047857]" },
      { key: "outgoing_dialed_base", label: "Исходящих дозвонов база", tone: "bg-[#f3f4f6] text-[#4b5563]" },
      { key: "total_calls", label: "Всего звонков", tone: "bg-[#eff6ff] text-[#1d4ed8]" },
      { key: "telegram", label: "Telegram", tone: "bg-[#ede9fe] text-[#6d28d9]" },
      { key: "max", label: "MAX", tone: "bg-[#fce7f3] text-[#be185d]" },
      { key: "whatsapp", label: "WhatsApp", tone: "bg-[#dcfce7] text-[#15803d]" },
    ],
  },
  {
    title: "Лиды и визиты",
    description: "Заявки, встречи и посещения без ручного ввода.",
    items: [
      { key: "site_applications", label: "Заявок сайта", tone: "bg-[#e0f2fe] text-[#0369a1]" },
      { key: "new_site_applications", label: "Из них новых", tone: "bg-[#ecfeff] text-[#0f766e]" },
      { key: "guest_visits", label: "Гостевых визитов", tone: "bg-[#fff7ed] text-[#c2410c]" },
      { key: "meetings_scheduled", label: "Назначено встреч", tone: "bg-[#f5f3ff] text-[#7c3aed]" },
    ],
  },
  {
    title: "Результаты",
    description: "Сделки и промежуточные результаты дня.",
    items: [
      { key: "day_sales", label: "Продаж день в день", tone: "bg-[#ecfdf5] text-[#047857]" },
      { key: "refusals", label: "Отказов", tone: "bg-[#fff1f2] text-[#be123c]" },
      { key: "renewals", label: "Продлений", tone: "bg-[#f8fafc] text-[#334155]" },
      { key: "negative_result", label: "Отрицательный результат", tone: "bg-[#fee2e2] text-[#b91c1c]" },
      { key: "no_result", label: "Без результата", tone: "bg-[#f3f4f6] text-[#6b7280]" },
      { key: "reviews", label: "Отзывов", tone: "bg-[#f1f5f9] text-[#475569]" },
    ],
  },
  {
    title: "Финансы",
    description: "Касса и денежные итоги на день.",
    items: [
      { key: "cash_op", label: "Касса ОП", tone: "bg-[#dbeafe] text-[#1d4ed8]", format: "money" },
      { key: "day_sales_amount", label: "Сумма продаж", tone: "bg-[#e0e7ff] text-[#4338ca]", format: "money" },
    ],
  },
];

function formatReportDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function renderMetricValue(metric: {
  key: keyof DailyReportMetrics;
  format?: "money";
}, report: DailyReportMetrics) {
  const value = report[metric.key];
  if (metric.format === "money") {
    return formatMoney(value as string);
  }

  if (metric.key === "cash_op" || metric.key === "day_sales_amount") {
    return formatMoney(value as string);
  }

  return String(value);
}

export default async function DailyReportPage({ searchParams }: DailyReportPageProps) {
  const params = await searchParams;
  const todayIso = getIsoDate(0);
  const yesterdayIso = getIsoDate(1);
  const reportDate = params.date?.trim() || todayIso;

  let report = createEmptyReport(reportDate);
  let offline = false;

  try {
    report = await getDailyReport(undefined, reportDate);
  } catch {
    offline = true;
  }

const quickLinks: { label: string; href: ComponentProps<typeof Link>["href"] }[] = [
  { label: "Сегодня", href: "/dashboard/daily-report" },
  { label: "Вчера", href: `/dashboard/daily-report?date=${yesterdayIso}` },
  { label: "Телефония", href: "/dashboard/telephony" },
  { label: "Посещаемость", href: "/dashboard/attendance" },
];

  return (
    <DashboardShell>
      <ModulePageLayout
        sidebar={
          <>
            <WidgetCard title="Источники" className="bg-white">
              <div className="space-y-2 text-[13px]">
                {report.source_notes.length > 0 ? (
                  report.source_notes.map((note) => (
                    <p key={note} className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 leading-5 text-[var(--muted)]">
                      {note}
                    </p>
                  ))
                ) : (
                  <p className="text-[var(--muted)]">Источники недоступны.</p>
                )}
              </div>
            </WidgetCard>

            <WidgetCard title="В план" className="bg-white">
              <div className="space-y-2 text-[13px]">
                {report.plan_items.length > 0 ? (
                  report.plan_items.map((item) => (
                    <p key={item} className="rounded-2xl border border-[var(--line)] bg-[#fff7ed] px-3 py-2 leading-5 text-[#9a3412]">
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="text-[var(--muted)]">Пока нет пунктов для плана.</p>
                )}
              </div>
            </WidgetCard>
          </>
        }
      >
        <WorkspaceCard className="daily-report-workspace-card min-w-0 flex-1 overflow-hidden">
          <div className="border-b border-[var(--line)] bg-[linear-gradient(180deg,#1f5e9e_0%,#17497b_100%)] px-5 py-5 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  Ежедневный отчет
                </p>
                <h1 className="mt-2 text-[30px] font-semibold leading-none">Личный отчет за день</h1>
                <p className="mt-3 max-w-3xl text-[13px] leading-6 text-white/75">
                  Автоматически собираем звонки, сообщения, заявки, посещения, продажи и платежи.
                  Если источника нет, он уходит в план.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-white/15"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <form method="get" className="mt-5 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-[13px] text-white/85 shadow-inner shadow-black/5 backdrop-blur">
                <span className="font-medium">Дата</span>
                <input
                  type="date"
                  name="date"
                  defaultValue={reportDate}
                  className="border-0 bg-transparent text-[13px] text-white outline-none"
                />
              </label>
              <button
                type="submit"
                className="rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1f5e9e] transition hover:bg-white/90"
              >
                Показать
              </button>
              {reportDate !== todayIso ? (
                <Link
                  href="/dashboard/daily-report"
                  className="rounded-full border border-white/20 px-4 py-2.5 text-[13px] font-medium text-white/85 hover:bg-white/10"
                >
                  Сбросить
                </Link>
              ) : null}
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-[13px] text-white/85">
                Обновлено {formatGeneratedAt(report.generated_at)}
              </span>
            </form>
          </div>

          <div className="border-b border-[var(--line)] bg-[var(--panel-muted)] px-5 py-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Компания</p>
                <p className="mt-1 text-[18px] font-semibold text-[var(--text)]">{report.company.name}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Дата отчета</p>
                <p className="mt-1 text-[18px] font-semibold text-[var(--text)]">{formatReportDate(report.report_date)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Всего звонков</p>
                <p className="mt-1 text-[18px] font-semibold text-[var(--text)]">{report.metrics.total_calls}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Касса ОП</p>
                <p className="mt-1 text-[18px] font-semibold text-[var(--text)]">{formatMoney(report.metrics.cash_op)}</p>
              </div>
            </div>
          </div>

          {offline ? (
            <div className="border-b border-[var(--line)] bg-[#fff7ed] px-5 py-4 text-[13px] text-[#9a3412]">
              Backend недоступен. Отчет открыт с пустыми значениями.
            </div>
          ) : null}

          <div className="space-y-4 px-5 py-5">
            {sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-[18px] font-semibold text-[var(--text)]">{section.title}</h2>
                    <p className="text-[13px] leading-6 text-[var(--muted)]">{section.description}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {section.items.map((item) => (
                    <div key={item.key} className="rounded-3xl border border-[var(--line)] bg-white p-4 shadow-sm">
                      <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.tone}`}>
                        {item.label}
                      </div>
                      <div className="mt-3 text-[32px] font-semibold leading-none text-[var(--text)]">
                        {renderMetricValue(item, report.metrics)}
                      </div>
                      <p className="mt-2 text-[12px] leading-5 text-[var(--muted)]">
                        {item.format === "money" ? "Финансовый итог дня" : "Автоматически собранный показатель"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </WorkspaceCard>
      </ModulePageLayout>
    </DashboardShell>
  );
}
