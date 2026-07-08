import type { Metadata } from "next";
import Link from "next/link";

import { TrainersFilters } from "@/components/trainers/trainers-filters";
import { TrainersModuleHeader } from "@/components/trainers/trainers-module-header";
import { WorkspaceCard } from "@/components/workspace-card";
import { getBranches, getTrainers } from "@/lib/api";
import type { BranchOption, TrainerRecord } from "@/lib/types";

export const metadata: Metadata = { title: "Тренеры" };

type TrainersPageProps = {
  searchParams: Promise<{
    search?: string;
    active?: string;
    type?: string;
    rent?: string;
  }>;
};

const statusLabels: Record<string, string> = {
  true: "Активен",
  false: "Неактивен",
};

const statusClass = (isActive: boolean) =>
  isActive ? "bg-[#e8f7d4] text-[#5e7a1f]" : "bg-[#f3f4f6] text-[#6b7280]";

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function TrainersPage({ searchParams }: TrainersPageProps) {
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const active = params.active?.trim() ?? "";
  const type = params.type?.trim() ?? "";
  const rent = params.rent?.trim() ?? "";

  let trainers: TrainerRecord[] = [];
  let branches: BranchOption[] = [];
  let loadError = false;

  try {
    [trainers, branches] = await Promise.all([getTrainers(), getBranches()]);
  } catch {
    loadError = true;
  }

  const filteredTrainers = trainers.filter((trainer) => {
    const phone = trainer.phone || "";
    const matchesSearch =
      !search ||
      trainer.full_name.toLowerCase().includes(search.toLowerCase()) ||
      phone.toLowerCase().includes(search.toLowerCase()) ||
      (trainer.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (trainer.specialization || "").toLowerCase().includes(search.toLowerCase());
    const matchesActive = !active || String(trainer.is_active) === active;
    const matchesType =
      !type ||
      (type === "gym" && trainer.trains_gym_floor) ||
      (type === "group" && trainer.trains_group_programs);
    const matchesRent =
      !rent ||
      !trainer.trains_gym_floor ||
      (rent === "paid" && trainer.rent_paid_current_month) ||
      (rent === "unpaid" && !trainer.rent_paid_current_month);
    return matchesSearch && matchesActive && matchesType && matchesRent;
  });

  const activeCount = trainers.filter((trainer) => trainer.is_active).length;
  const gymFloorTrainers = trainers.filter((trainer) => trainer.trains_gym_floor);
  const unpaidRentCount = gymFloorTrainers.filter((trainer) => !trainer.rent_paid_current_month).length;

  return (
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="trainers-workspace-card min-w-0 flex-1">
          <TrainersModuleHeader total={trainers.length} activeCount={activeCount} branchesCount={branches.length} />

          {loadError ? (
            <div className="mx-5 mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
              Не удалось загрузить список тренеров. Проверьте, что backend и база данных запущены.
            </div>
          ) : null}

          <TrainersFilters search={search} active={active} type={type} rent={rent} />

          <div className="border-b border-[var(--line)] bg-[var(--panel-muted)] px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Всего</p>
                <p className="mt-1 text-[24px] font-semibold text-[var(--text)]">{trainers.length}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Активные</p>
                <p className="mt-1 text-[24px] font-semibold text-[var(--text)]">{activeCount}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Тренажёрный зал</p>
                <p className="mt-1 text-[24px] font-semibold text-[var(--text)]">{gymFloorTrainers.length}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Филиалов</p>
                <p className="mt-1 text-[24px] font-semibold text-[var(--text)]">{branches.length}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-[12px] text-[var(--muted)]">Аренда не оплачена</p>
                <p className={`mt-1 text-[24px] font-semibold ${unpaidRentCount > 0 ? "text-[#b91c1c]" : "text-[var(--text)]"}`}>
                  {unpaidRentCount}
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-white">
            <table className="min-w-full text-left text-[13px]">
              <thead className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--panel-muted)] text-[12px] uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Тренер</th>
                  <th className="px-4 py-3 font-medium">Телефон</th>
                  <th className="px-4 py-3 font-medium">Тип</th>
                  <th className="px-4 py-3 font-medium">Филиал</th>
                  <th className="px-4 py-3 font-medium">Аренда</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filteredTrainers.length > 0 ? (
                  filteredTrainers.map((trainer) => (
                    <tr key={trainer.id} className="hover:bg-[#f8fbfe]">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/trainers/${trainer.id}`} className="flex items-center gap-3">
                          {trainer.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={trainer.photo_url}
                              alt={trainer.full_name}
                              className="h-9 w-9 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[12px] font-semibold text-[var(--accent-strong)]">
                              {initials(trainer.full_name)}
                            </span>
                          )}
                          <span>
                            <span className="block font-semibold text-[var(--text)] hover:text-[var(--accent-strong)]">
                              {trainer.full_name}
                            </span>
                            <span className="block text-[12px] text-[var(--muted)]">
                              {trainer.specialization || trainer.email || "Без специализации"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{trainer.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {trainer.trains_gym_floor ? (
                            <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] font-semibold text-[#4338ca]">
                              Зал
                            </span>
                          ) : null}
                          {trainer.trains_group_programs ? (
                            <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-[11px] font-semibold text-[#c2410c]">
                              Группа
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{trainer.branch_name || "—"}</td>
                      <td className="px-4 py-3">
                        {trainer.trains_gym_floor ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              trainer.rent_paid_current_month
                                ? "bg-[#ecfdf5] text-[#047857]"
                                : "bg-[#fef2f2] text-[#b91c1c]"
                            }`}
                          >
                            {trainer.rent_paid_current_month ? "Оплачена" : "Не оплачена"}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(trainer.is_active)}`}>
                          {statusLabels[String(trainer.is_active)] ?? (trainer.is_active ? "Активен" : "Неактивен")}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-[13px] text-[var(--muted)]" colSpan={6}>
                      {search || active || type || rent ? (
                        <>По текущему фильтру тренеры не найдены.</>
                      ) : (
                        <>
                          Тренеров пока нет.{" "}
                          <Link href="/dashboard/trainers/new" className="text-[var(--accent-strong)] hover:underline">
                            Добавить первого
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
  );
}
