"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { listTasksAction } from "@/app/actions/tasks";
import { TasksEmptyState } from "@/components/tasks-empty-state";
import { TasksListTable } from "@/components/tasks-list-table";
import { TasksModuleHeader } from "@/components/tasks-module-header";
import { TasksToolbarFilters } from "@/components/tasks-toolbar-filters";
import { WorkspaceCard } from "@/components/workspace-card";
import type { TaskRecord } from "@/lib/types";

export function TasksListWorkspace() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const due = (searchParams.get("due") as "today" | "overdue" | undefined) || undefined;
  const role = searchParams.get("role") || undefined;

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const hasFilters = Boolean(search || status || due || role);

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      setLoading(true);
      setError(false);
      try {
        const rows = await listTasksAction({ search, status, due });
        if (!cancelled) {
          setTasks(rows);
        }
      } catch {
        if (!cancelled) {
          setTasks([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTasks();
    return () => {
      cancelled = true;
    };
  }, [search, status, due]);

  return (
    <WorkspaceCard className="crm-workspace-card tasks-workspace-card min-w-0 flex-1">
      <TasksModuleHeader
        filters={
          <TasksToolbarFilters search={search} status={status} due={due} role={role} />
        }
        preserveQuery={{ search, status, due }}
      />

      <div className="tasks-list-body">
        {loading ? (
          <div className="px-4 py-8 text-[13px] text-[var(--muted)]">Загрузка задач…</div>
        ) : tasks.length > 0 ? (
          <TasksListTable tasks={tasks} />
        ) : (
          <TasksEmptyState hasFilters={hasFilters || error} />
        )}
      </div>
    </WorkspaceCard>
  );
}
