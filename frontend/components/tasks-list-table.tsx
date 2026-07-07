import Link from "next/link";

import { StatusBadge, taskStatusTone } from "@/components/status-badge";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/api";
import type { TaskRecord } from "@/lib/types";

type TasksListTableProps = {
  tasks: TaskRecord[];
};

function formatDeadline(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatActivity(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function TasksListTable({ tasks }: TasksListTableProps) {
  return (
    <div className="tasks-list-table-wrap">
      <div className="tasks-list-table-head">
        <span className="tasks-col tasks-col-check">
          <input type="checkbox" aria-label="Выбрать все" className="tasks-checkbox" disabled />
        </span>
        <span className="tasks-col tasks-col-name">Название</span>
        <span className="tasks-col tasks-col-activity">Активность</span>
        <span className="tasks-col tasks-col-deadline">Крайний срок</span>
        <span className="tasks-col tasks-col-creator">Постановщик</span>
        <span className="tasks-col tasks-col-assignee">Исполнитель</span>
        <span className="tasks-col tasks-col-project">Проект</span>
        <span className="tasks-col tasks-col-tags">Теги</span>
      </div>

      {tasks.map((task) => (
        <div key={task.id} className="tasks-list-table-row">
          <span className="tasks-col tasks-col-check">
            <input type="checkbox" aria-label={`Выбрать «${task.title}»`} className="tasks-checkbox" disabled />
          </span>
          <span className="tasks-col tasks-col-name">
            <Link href={`/dashboard/tasks/${task.id}`} className="tasks-row-title">
              {task.title}
            </Link>
            <StatusBadge
              label={taskStatusLabels[task.status] ?? task.status}
              tone={taskStatusTone(task.status)}
            />
          </span>
          <span className="tasks-col tasks-col-activity text-[var(--muted)]">
            {formatActivity(task.updated_at)}
          </span>
          <span className="tasks-col tasks-col-deadline">{formatDeadline(task.due_at)}</span>
          <span className="tasks-col tasks-col-creator text-[var(--muted)]">
            {task.created_by_name ?? "—"}
          </span>
          <span className="tasks-col tasks-col-assignee text-[var(--muted)]">
            {task.assigned_to_name ?? "—"}
          </span>
          <span className="tasks-col tasks-col-project text-[var(--muted)]">
            {task.branch_name ?? "—"}
          </span>
          <span className="tasks-col tasks-col-tags">
            <span className="tasks-tag">{taskPriorityLabels[task.priority] ?? task.priority}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
