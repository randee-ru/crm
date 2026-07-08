import type { Metadata } from "next";
import { Suspense } from "react";

import { TasksListWorkspace } from "@/components/tasks/tasks-list-workspace";

export const metadata: Metadata = {
  title: "Задачи и проекты",
};

export default function TasksPage() {
  return (
    <div className="workspace-content min-h-0 flex-1">
      <Suspense fallback={<div className="p-6 text-[13px] text-[var(--muted)]">Загрузка задач…</div>}>
        <TasksListWorkspace />
      </Suspense>
    </div>
  );
}
