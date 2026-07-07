import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard-shell";
import { TasksEmptyState } from "@/components/tasks-empty-state";
import { TasksListTable } from "@/components/tasks-list-table";
import { TasksModuleHeader } from "@/components/tasks-module-header";
import { TasksToolbarFilters } from "@/components/tasks-toolbar-filters";
import { WorkspaceCard } from "@/components/workspace-card";
import { getTasks } from "@/lib/api";

export const metadata: Metadata = {
  title: "Задачи и проекты",
};

type TasksPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    due?: string;
    role?: string;
    view?: string;
  }>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const filters = {
    search: params.search,
    status: params.status,
    due: params.due as "today" | "overdue" | undefined,
  };
  const hasFilters = Boolean(params.search || params.status || params.due || params.role);

  const tasks = await getTasks(undefined, filters);

  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="crm-workspace-card tasks-workspace-card min-w-0 flex-1">
          <TasksModuleHeader
            filters={
              <TasksToolbarFilters
                search={params.search}
                status={params.status}
                due={params.due}
                role={params.role}
              />
            }
            preserveQuery={{
              search: params.search,
              status: params.status,
              due: params.due,
            }}
          />

          <div className="tasks-list-body">
            {tasks.length > 0 ? (
              <TasksListTable tasks={tasks} />
            ) : (
              <TasksEmptyState hasFilters={hasFilters} />
            )}
          </div>
        </WorkspaceCard>
      </div>
    </DashboardShell>
  );
}
