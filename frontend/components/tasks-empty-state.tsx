import Link from "next/link";

type TasksEmptyStateProps = {
  hasFilters?: boolean;
};

export function TasksEmptyState({ hasFilters = false }: TasksEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="tasks-empty-state">
        <p className="tasks-empty-state-title">Задачи не найдены</p>
        <p className="tasks-empty-state-text">Попробуйте изменить фильтры или сбросить поиск.</p>
        <Link href="/dashboard/tasks" className="tasks-empty-state-link">
          Сбросить фильтры
        </Link>
      </div>
    );
  }

  return (
    <div className="tasks-empty-state">
      <div className="tasks-empty-state-illustration" aria-hidden="true">
        <svg viewBox="0 0 80 80" className="h-16 w-16 fill-none stroke-current stroke-[1.5]">
          <rect x="12" y="18" width="56" height="44" rx="6" />
          <path d="M24 34h32M24 44h20" strokeLinecap="round" />
          <path d="M52 12v12M46 18h12" strokeLinecap="round" />
        </svg>
      </div>
      <p className="tasks-empty-state-title">Создайте задачу</p>
      <p className="tasks-empty-state-text">
        Здесь будет список задач, которые вы выполняете или поручаете своим сотрудникам.
      </p>
      <Link href="/dashboard/tasks/new" className="tasks-btn-create tasks-btn-create--large">
        + Создать задачу
      </Link>
    </div>
  );
}
