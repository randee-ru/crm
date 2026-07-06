import type { Metadata } from "next";
import Link from "next/link";

import { DashboardShell } from "@/components/dashboard-shell";
import { ModulePageLayout } from "@/components/module-page-layout";
import { TrainerForm } from "@/components/trainers/trainer-form";
import { WidgetCard } from "@/components/widget-card";
import { WorkspaceCard } from "@/components/workspace-card";
import { getBranches, getCompanyContext, getTrainers } from "@/lib/api";
import type { BranchOption, TrainerRecord } from "@/lib/types";

export const metadata: Metadata = { title: "Тренеры" };

type TrainersPageProps = {
  searchParams: Promise<{
    search?: string;
    active?: string;
  }>;
};

const statusLabels: Record<string, string> = {
  true: "Активен",
  false: "Неактивен",
};

const statusClass = (isActive: boolean) =>
  isActive ? "bg-[#e8f7d4] text-[#5e7a1f]" : "bg-[#f3f4f6] text-[#6b7280]";

export default async function TrainersPage({ searchParams }: TrainersPageProps) {
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const active = params.active?.trim() ?? "";

  const [company, trainers, branches] = await Promise.all([
    getCompanyContext().catch(() => null),
    getTrainers().catch(() => [] as TrainerRecord[]),
    getBranches().catch(() => [] as BranchOption[]),
  ]);

  const filteredTrainers = trainers.filter((trainer) => {
    const matchesSearch =
      !search ||
      trainer.full_name.toLowerCase().includes(search.toLowerCase()) ||
      trainer.phone.toLowerCase().includes(search.toLowerCase()) ||
      (trainer.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (trainer.specialization || "").toLowerCase().includes(search.toLowerCase());
    const matchesActive = !active || String(trainer.is_active) === active;
    return matchesSearch && matchesActive;
  });

  const activeCount = trainers.filter((trainer) => trainer.is_active).length;

  return (
    <DashboardShell>
      <ModulePageLayout
        sidebar={
          <>
            <WidgetCard title="Клуб" className="bg-white">
              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Компания</span>
                  <span className="font-semibold text-[var(--text)]">{company?.name ?? "Компания"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Тренеров</span>
                  <span className="font-semibold text-[var(--text)]">{trainers.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Активных</span>
                  <span className="font-semibold text-[var(--text)]">{activeCount}</span>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard title="Создать тренера" className="bg-white">
              <TrainerForm branches={branches} />
            </WidgetCard>

            <WidgetCard title="Быстрые переходы" className="bg-white">
              <div className="flex flex-col gap-2">
                <Link href="/dashboard/bookings" className="bitrix-link text-[13px] font-medium">
                  К бронированиям
                </Link>
                <Link href="/dashboard/schedule" className="bitrix-link text-[13px] font-medium">
                  К расписанию
                </Link>
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
                  Тренеры
                </p>
                <h1 className="mt-2 text-[30px] font-semibold leading-none">База тренеров</h1>
                <p className="mt-3 max-w-3xl text-[13px] leading-6 text-white/75">
                  Ведите карточки тренеров, фильтруйте по статусу и редактируйте данные без лишних переходов.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="#create"
                  className="inline-flex items-center gap-2 rounded-full bg-[#27c56c] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#1fb15f]"
                >
                  + Добавить
                </Link>
                <Link
                  href="/dashboard/schedule"
                  className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-white/15"
                >
                  Расписание
                </Link>
              </div>
            </div>

            <form method="get" className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex min-w-[280px] flex-1 items-center rounded-full border border-white/15 bg-white/10 px-4 py-2.5 shadow-inner shadow-black/5 backdrop-blur">
                <input
                  name="search"
                  defaultValue={search}
                  placeholder="Поиск по имени, телефону, email или специализации"
                  className="w-full border-0 bg-transparent text-[14px] text-white placeholder:text-white/60 focus:outline-none"
                />
              </div>
              <select
                name="active"
                defaultValue={active}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-[13px] text-white outline-none"
              >
                <option value="">Все статусы</option>
                <option value="true">Активные</option>
                <option value="false">Неактивные</option>
              </select>
              <button
                type="submit"
                className="rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1f5e9e] transition hover:bg-white/90"
              >
                Найти
              </button>
              {search || active ? (
                <Link
                  href="/dashboard/trainers"
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
                <p className="text-[12px] text-[var(--muted)]">Всего</p>
                <p className="mt-1 text-[24px] font-semibold text-[var(--text)]">{trainers.length}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Активные</p>
                <p className="mt-1 text-[24px] font-semibold text-[var(--text)]">{activeCount}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Неактивные</p>
                <p className="mt-1 text-[24px] font-semibold text-[var(--text)]">
                  {Math.max(trainers.length - activeCount, 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Филиалов</p>
                <p className="mt-1 text-[24px] font-semibold text-[var(--text)]">{branches.length}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-[13px]">
              <thead className="border-b border-[var(--line)] bg-[var(--panel-muted)] text-[12px] uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Тренер</th>
                  <th className="px-4 py-3 font-medium">Телефон</th>
                  <th className="px-4 py-3 font-medium">Специализация</th>
                  <th className="px-4 py-3 font-medium">Филиал</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filteredTrainers.length > 0 ? (
                  filteredTrainers.map((trainer) => (
                    <tr key={trainer.id} className="hover:bg-[#f8fbfe]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/trainers/${trainer.id}`}
                          className="font-semibold text-[var(--text)] hover:text-[var(--accent-strong)]"
                        >
                          {trainer.full_name}
                        </Link>
                        <div className="text-[12px] text-[var(--muted)]">{trainer.email || "Без email"}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{trainer.phone}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{trainer.specialization || "—"}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{trainer.branch_name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(trainer.is_active)}`}>
                          {statusLabels[String(trainer.is_active)] ?? (trainer.is_active ? "Активен" : "Неактивен")}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-[13px] text-[var(--muted)]" colSpan={5}>
                      Нет данных. Запустите `seed_demo`, чтобы увидеть список тренеров.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </WorkspaceCard>
      </ModulePageLayout>
    </DashboardShell>
  );
}
