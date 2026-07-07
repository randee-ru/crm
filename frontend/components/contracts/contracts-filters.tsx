type ContractsFiltersProps = {
  search?: string;
  signed?: string;
};

export function ContractsFilters({ search = "", signed = "" }: ContractsFiltersProps) {
  return (
    <form method="get" className="contracts-filters">
      <label className="contracts-search-field">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2 text-[var(--muted)]">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          name="search"
          type="search"
          defaultValue={search}
          placeholder="Поиск по номеру, клиенту, бланку"
          className="contracts-search-input"
        />
      </label>
      <select name="signed" defaultValue={signed} className="contracts-select" aria-label="Статус подписания">
        <option value="">Все договоры</option>
        <option value="1">Подписанные</option>
        <option value="0">Не подписанные</option>
      </select>
      <button type="submit" className="btn-primary">
        Найти
      </button>
      {(search || signed) ? (
        <a href="/dashboard/contracts" className="btn-secondary">
          Сбросить
        </a>
      ) : null}
    </form>
  );
}
