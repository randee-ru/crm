type ClientFiltersProps = {
  search?: string;
  clientStatus?: string;
  view?: "kanban" | "list";
  resetHref?: string;
};

const statusOptions = [
  ["", "Все статусы"],
  ["lead", "Потенциальный"],
  ["active", "Действующий"],
  ["former", "Бывший"],
  ["rejected", "Отказ"],
] as const;

export function ClientFilters({
  search = "",
  clientStatus = "",
  view,
  resetHref = "/dashboard",
}: ClientFiltersProps) {
  return (
    <form method="get" className="crm-inline-filters">
      {view ? <input type="hidden" name="view" value={view} /> : null}
      <label className="crm-search-field">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2 text-[var(--muted)]">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          name="search"
          type="search"
          defaultValue={search}
          placeholder="Сделки и контакты"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--muted)]"
        />
        {(search || clientStatus) && (
          <span className="crm-filter-tag">
            {clientStatus
              ? (statusOptions.find(([v]) => v === clientStatus)?.[1] ?? "Фильтр")
              : "Поиск"}
          </span>
        )}
      </label>
      <select
        name="client_status"
        defaultValue={clientStatus}
        className="crm-select-field"
        aria-label="Статус клиента"
      >
        {statusOptions.map(([value, label]) => (
          <option key={value || "all"} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button type="submit" className="crm-apply-btn">
        Найти
      </button>
      {(search || clientStatus) && (
        <a href={resetHref} className="crm-reset-btn">
          Сбросить
        </a>
      )}
    </form>
  );
}
