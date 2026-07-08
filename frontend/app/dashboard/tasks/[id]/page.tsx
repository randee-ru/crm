import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CrmModuleHeader } from "@/components/crm-module-header";
import { ModulePageLayout } from "@/components/module-page-layout";
import { TaskForm } from "@/components/task-form";
import { WorkspaceCard } from "@/components/workspace-card";
import {
  formatDateTime,
  getClients,
  getCompanyContext,
  getTask,
  taskPriorityLabels,
  taskStatusLabels,
} from "@/lib/api";

type TaskDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: TaskDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const task = await getTask(Number(id));
    return { title: task.title };
  } catch {
    return { title: "Задача" };
  }
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  const taskId = Number(id);
  if (Number.isNaN(taskId)) notFound();

  let task;
  let company;
  let clients;

  try {
    [task, company, clients] = await Promise.all([
      getTask(taskId),
      getCompanyContext(),
      getClients(),
    ]);
  } catch {
    notFound();
  }

  return (
      <ModulePageLayout>
        <WorkspaceCard className="crm-workspace-card">
          <CrmModuleHeader
            title={task.title}
            activeTopTab={0}
            activeViewTab={2}
            showCreate={false}
            actions={
              <Link href="/dashboard/tasks" className="crm-btn-secondary">
                К списку · {taskStatusLabels[task.status] ?? task.status}
              </Link>
            }
          />
          <section className="grid gap-0 xl:grid-cols-[1fr_280px]">
            <div className="border-r border-[var(--line)] p-4 md:p-6">
              <TaskForm clients={clients} task={task} mode="edit" />
            </div>
            <aside className="bg-[var(--panel-muted)] p-4">
              <div className="rounded-xl border border-[var(--line)] bg-white p-4">
                <h2 className="text-[15px] font-semibold text-[var(--text)]">Контекст</h2>
                <dl className="mt-3 space-y-2 text-[13px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--muted)]">Компания</dt>
                    <dd>{company.name}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--muted)]">Приоритет</dt>
                    <dd>{taskPriorityLabels[task.priority] ?? task.priority}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--muted)]">Срок</dt>
                    <dd>{formatDateTime(task.due_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--muted)]">Ответственный</dt>
                    <dd>{task.assigned_to_name ?? "—"}</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </section>
        </WorkspaceCard>
      </ModulePageLayout>
  );
}
