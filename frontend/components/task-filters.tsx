type TaskFiltersProps = {
  search?: string;
  status?: string;
  due?: string;
};

export function TaskFilters({ search = "", status = "", due = "" }: TaskFiltersProps) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-white px-3 py-3"
    >
      <label className="flex min-w-[220px] flex-1 items-center rounded border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[13px]">
        <span className="mr-2 text-[var(--muted)]">⌕</span>
        <input
          name="search"
          type="search"
          defaultValue={search}
          placeholder="Заголовок или описание"
          className="w-full border-0 bg-transparent outline-none"
        />
      </label>
      <select
        name="status"
        defaultValue={status}
        className="rounded border border-[var(--line)] bg-white px-3 py-2 text-[13px]"
      >
        <option value="">Все статусы</option>
        <option value="open">Открыта</option>
        <option value="in_progress">В работе</option>
        <option value="done">Выполнена</option>
        <option value="cancelled">Отменена</option>
      </select>
      <select
        name="due"
        defaultValue={due}
        className="rounded border border-[var(--line)] bg-white px-3 py-2 text-[13px]"
      >
        <option value="">Любой срок</option>
        <option value="today">Сегодня</option>
        <option value="overdue">Просрочено</option>
      </select>
      <button
        type="submit"
        className="rounded bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white"
      >
        Применить
      </button>
      {(search || status || due) && (
        <a
          href="/dashboard/tasks"
          className="rounded border border-[var(--line)] bg-white px-4 py-2 text-[13px]"
        >
          Сбросить
        </a>
      )}
    </form>
  );
}
