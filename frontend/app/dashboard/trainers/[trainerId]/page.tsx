import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { ModulePageLayout } from "@/components/module-page-layout";
import { TrainerDeleteButton } from "@/components/trainers/trainer-delete-button";
import { TrainerForm } from "@/components/trainers/trainer-form";
import { WidgetCard } from "@/components/widget-card";
import { WorkspaceCard } from "@/components/workspace-card";
import { getBranches, getTrainer } from "@/lib/api";
import type { BranchOption, TrainerDetail } from "@/lib/types";

type TrainerPageProps = {
  params: Promise<{
    trainerId: string;
  }>;
};

export async function generateMetadata({ params }: TrainerPageProps): Promise<Metadata> {
  const resolved = await params;
  return {
    title: `Тренер ${resolved.trainerId}`,
  };
}

export default async function TrainerDetailPage({ params }: TrainerPageProps) {
  const resolved = await params;
  const trainerId = Number(resolved.trainerId);

  if (!Number.isFinite(trainerId)) {
    notFound();
  }

  let trainer: TrainerDetail;
  let branches: BranchOption[] = [];

  try {
    [trainer, branches] = await Promise.all([
      getTrainer(trainerId),
      getBranches().catch(() => [] as BranchOption[]),
    ]);
  } catch {
    notFound();
  }

  return (
    <DashboardShell>
      <ModulePageLayout
        sidebar={
          <>
            <WidgetCard title="Сводка" className="bg-white">
              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Филиал</span>
                  <span className="font-semibold text-[var(--text)]">{trainer.branch_name || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Статус</span>
                  <span className="font-semibold text-[var(--text)]">{trainer.is_active ? "Активен" : "Неактивен"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Телефон</span>
                  <span className="font-semibold text-[var(--text)]">{trainer.phone}</span>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard title="Действия" className="bg-white">
              <div className="flex flex-col gap-2">
                <Link href="/dashboard/trainers" className="bitrix-link text-[13px] font-medium">
                  К списку тренеров
                </Link>
                <TrainerDeleteButton trainerId={trainer.id} />
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
                  Карточка тренера
                </p>
                <h1 className="mt-2 text-[30px] font-semibold leading-none">{trainer.full_name}</h1>
                <p className="mt-3 max-w-3xl text-[13px] leading-6 text-white/75">
                  Редактируйте контакты, специализацию, филиал и активность тренера в одном экране.
                </p>
              </div>
              <Link
                href="/dashboard/trainers"
                className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-white/15"
              >
                Назад
              </Link>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border-b border-[var(--line)] p-5 lg:border-b-0 lg:border-r">
              <h2 className="mb-3 text-[18px] font-semibold text-[var(--text)]">Настройки тренера</h2>
              <TrainerForm trainer={trainer} branches={branches} submitLabel="Сохранить изменения" />
            </div>

            <div className="p-5">
              <div className="space-y-3">
                <WidgetCard title="Основное" className="bg-white">
                  <div className="space-y-2 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--muted)]">Имя</span>
                      <span className="font-semibold text-[var(--text)]">{trainer.first_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--muted)]">Фамилия</span>
                      <span className="font-semibold text-[var(--text)]">{trainer.last_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--muted)]">Email</span>
                      <span className="font-semibold text-[var(--text)]">{trainer.email || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--muted)]">Специализация</span>
                      <span className="font-semibold text-[var(--text)]">{trainer.specialization || "—"}</span>
                    </div>
                  </div>
                </WidgetCard>

                <WidgetCard title="Точки входа" className="bg-white">
                  <div className="flex flex-col gap-2">
                    <Link href="/dashboard/bookings" className="bitrix-link text-[13px] font-medium">
                      Смотреть бронирования
                    </Link>
                    <Link href="/dashboard/attendance" className="bitrix-link text-[13px] font-medium">
                      Смотреть посещения
                    </Link>
                    <Link href="/dashboard/schedule" className="bitrix-link text-[13px] font-medium">
                      Смотреть расписание
                    </Link>
                  </div>
                </WidgetCard>
              </div>
            </div>
          </div>
        </WorkspaceCard>
      </ModulePageLayout>
    </DashboardShell>
  );
}
