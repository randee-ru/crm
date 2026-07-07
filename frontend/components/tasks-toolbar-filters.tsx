import { taskStatusLabels } from "@/lib/api";

type TasksToolbarFiltersProps = {
  search?: string;
  status?: string;
  due?: string;
  role?: string;
};

export function TasksToolbarFilters({
  search = "",
  status = "",
  due = "",
  role = "",
}: TasksToolbarFiltersProps) {
  const activeStatusLabel = status ? (taskStatusLabels[status] ?? status) : null;
  const activeDueLabel =
    due === "today" ? "Сегодня" : due === "overdue" ? "Просрочено" : null;

  return (
    <form method="get" className="tasks-toolbar-filters">
      <div className="tasks-toolbar-filters-left">
        <label className="tasks-role-select">
          <span className="sr-only">Роль</span>
          <select name="role" defaultValue={role} className="tasks-role-select-input">
            <option value="">Все роли</option>
            <option value="assignee">Исполнитель</option>
            <option value="creator">Постановщик</option>
            <option value="observer">Наблюдатель</option>
          </select>
        </label>

        <label className="tasks-search-field">
          <span className="tasks-search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            name="search"
            type="search"
            defaultValue={search}
            placeholder="Поиск"
            className="tasks-search-input"
          />
        </label>

        {activeStatusLabel ? (
          <span className="tasks-filter-tag">
            {activeStatusLabel}
            <input type="hidden" name="status" value={status} />
          </span>
        ) : (
          <select name="status" defaultValue={status} className="tasks-status-select">
            <option value="">Все статусы</option>
            <option value="open">Открыта</option>
            <option value="in_progress">В работе</option>
            <option value="done">Выполнена</option>
            <option value="cancelled">Отменена</option>
          </select>
        )}

        {activeDueLabel ? (
          <span className="tasks-filter-tag">
            {activeDueLabel}
            <input type="hidden" name="due" value={due} />
          </span>
        ) : (
          <select name="due" defaultValue={due} className="tasks-due-select">
            <option value="">Любой срок</option>
            <option value="today">Сегодня</option>
            <option value="overdue">Просрочено</option>
          </select>
        )}

        <button type="submit" className="tasks-filter-apply">
          Найти
        </button>

        {(search || status || due || role) && (
          <a href="/dashboard/tasks" className="tasks-filter-reset">
            Сбросить
          </a>
        )}
      </div>

      <button type="button" className="tasks-settings-btn" aria-label="Настройки списка">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1 1.36 1.11H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
