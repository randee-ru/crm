import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmployeeDeleteButton } from "@/components/employees/employee-delete-button";
import { EmployeeEditForm } from "@/components/employees/employee-edit-form";
import { FitnessModulePage } from "@/components/fitness-module-page";
import { WidgetCard } from "@/components/widget-card";
import { workspaceGroupLabels } from "@/lib/access-groups";
import { getAuthSession } from "@/lib/auth";
import { getEmployeeMembership, getEmployeesDashboard } from "@/lib/api";
import { formatRussianPhoneInput } from "@/lib/phone";

type EmployeeDetailPageProps = {
  params: Promise<{
    membershipId: string;
  }>;
};

export async function generateMetadata({ params }: EmployeeDetailPageProps): Promise<Metadata> {
  const resolved = await params;
  const membershipId = Number(resolved.membershipId);
  if (!Number.isFinite(membershipId)) {
    return { title: "Сотрудник" };
  }

  try {
    const membership = await getEmployeeMembership(membershipId);
    return { title: `Сотрудник: ${membership.display_name}` };
  } catch {
    return { title: "Сотрудник" };
  }
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const resolved = await params;
  const membershipId = Number(resolved.membershipId);
  const session = await getAuthSession();

  if (!Number.isFinite(membershipId)) {
    notFound();
  }

  if (!session || session.company?.disabled_modules?.includes("employees")) {
    notFound();
  }

  const [dashboard, membership] = await Promise.all([
    getEmployeesDashboard().catch(() => null),
    getEmployeeMembership(membershipId).catch(() => null),
  ]);

  if (!membership) {
    notFound();
  }

  const branches = dashboard?.branches ?? [];

  return (
    <FitnessModulePage
      title="Настройка сотрудника"
      description="Редактируйте карточку сотрудника, группу, филиал и активность без переключения между экранами."
      showCreate={false}
      sidebar={
        <>
          <WidgetCard title="Сотрудник" className="bg-white">
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Имя</span>
                <span className="font-semibold text-[var(--text)]">{membership.display_name}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Email</span>
                <span className="font-semibold text-[var(--text)]">{membership.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Телефон</span>
                <span className="font-semibold text-[var(--text)]">
                  {membership.phone ? formatRussianPhoneInput(membership.phone) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Дата рождения</span>
                <span className="font-semibold text-[var(--text)]">
                  {membership.birth_date
                    ? new Date(`${membership.birth_date}T00:00:00`).toLocaleDateString("ru-RU")
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Группа</span>
                <span className="font-semibold text-[var(--text)]">
                  {workspaceGroupLabels[membership.role] ?? membership.role}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Статус</span>
                <span className="font-semibold text-[var(--text)]">
                  {membership.is_active ? "Активен" : "Неактивен"}
                </span>
              </div>
            </div>
          </WidgetCard>

          <WidgetCard title="Быстрые действия" className="bg-white">
            <div className="flex flex-col gap-2">
              <Link href="/dashboard/employees" className="bitrix-link text-[13px] font-medium">
                Вернуться к списку
              </Link>
              <EmployeeDeleteButton
                membershipId={membership.id}
                employeeName={membership.display_name}
                disabled={membership.user_id === session.user.id}
              />
              <Link
                href="/dashboard/settings?section=employees"
                className="bitrix-link text-[13px] font-medium"
              >
                Открыть настройки раздела
              </Link>
            </div>
          </WidgetCard>
        </>
      }
    >
      <div className="overflow-hidden bg-white">
        <div className="border-b border-[var(--line)] bg-[linear-gradient(180deg,#2b71bf_0%,#1f5e9e_100%)] px-5 py-5 text-white">
          <Link
            href="/dashboard/employees"
            className="inline-flex items-center text-[12px] font-medium text-white/70 hover:text-white"
          >
            ← Назад к списку
          </Link>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Карточка доступа
              </p>
              <h1 className="mt-2 text-[28px] font-semibold">{membership.display_name}</h1>
              <p className="mt-2 text-[13px] text-white/75">
                Настройте группу, филиал и параметры доступа сотрудника.
              </p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white">
              {membership.branch_name || "Без филиала"}
            </span>
          </div>
        </div>

        <div className="bg-white p-5">
          <EmployeeEditForm membership={membership} branches={branches} />
        </div>
      </div>
    </FitnessModulePage>
  );
}
