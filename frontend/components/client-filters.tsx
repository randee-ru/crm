type ClientFiltersProps = {
  search?: string;
  clientStatus?: string;
  birthDateFrom?: string;
  birthDateTo?: string;
  birthdayMonth?: string;
  membershipExpiresInDays?: string;
  variant?: "default" | "crm";
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
  birthDateFrom = "",
  birthDateTo = "",
  birthdayMonth = "",
  membershipExpiresInDays = "",
  variant = "default",
  view,
  resetHref = "/dashboard/clients",
}: ClientFiltersProps) {
  if (variant === "crm") {
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
            placeholder="Контакты в работе"
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
        <input type="hidden" name="birth_date_from" value={birthDateFrom} />
        <input type="hidden" name="birth_date_to" value={birthDateTo} />
        <input type="hidden" name="birthday_month" value={birthdayMonth} />
        <input type="hidden" name="membership_expires_in_days" value={membershipExpiresInDays} />
        <button type="submit" className="crm-apply-btn">
          Найти
        </button>
        {(search || clientStatus || birthDateFrom || birthDateTo || birthdayMonth || membershipExpiresInDays) && (
          <a href={resetHref} className="crm-reset-btn">
            Сбросить
          </a>
        )}
      </form>
    );
  }

  return (
    <form
      method="get"
      className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-white px-4 py-3"
    >
      <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[13px] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/15">
        <span className="text-[var(--muted)]">⌕</span>
        <input
          name="search"
          type="search"
          defaultValue={search}
          placeholder="Имя, телефон, email"
          className="w-full border-0 bg-transparent outline-none"
        />
      </label>

      <select
        name="client_status"
        defaultValue={clientStatus}
        className="form-field w-auto min-w-[150px] bg-white"
      >
        {statusOptions.map(([value, label]) => (
          <option key={value || "all"} value={value}>
            {label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[13px]">
        <span className="text-[var(--muted)]">ДР от</span>
        <input
          name="birth_date_from"
          type="date"
          defaultValue={birthDateFrom}
          className="w-[140px] border-0 bg-transparent p-0 outline-none"
        />
      </label>

      <label className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[13px]">
        <span className="text-[var(--muted)]">до</span>
        <input
          name="birth_date_to"
          type="date"
          defaultValue={birthDateTo}
          className="w-[140px] border-0 bg-transparent p-0 outline-none"
        />
      </label>

      <select
        name="birthday_month"
        defaultValue={birthdayMonth}
        className="form-field w-auto min-w-[140px] bg-white"
        aria-label="Месяц рождения"
      >
        <option value="">Месяц ДР</option>
        <option value="1">Январь</option>
        <option value="2">Февраль</option>
        <option value="3">Март</option>
        <option value="4">Апрель</option>
        <option value="5">Май</option>
        <option value="6">Июнь</option>
        <option value="7">Июль</option>
        <option value="8">Август</option>
        <option value="9">Сентябрь</option>
        <option value="10">Октябрь</option>
        <option value="11">Ноябрь</option>
        <option value="12">Декабрь</option>
      </select>

      <select
        name="membership_expires_in_days"
        defaultValue={membershipExpiresInDays}
        className="form-field w-auto min-w-[160px] bg-white"
        aria-label="Срок окончания абонемента"
      >
        <option value="">Абонемент</option>
        <option value="7">7 дней</option>
        <option value="14">14 дней</option>
        <option value="30">30 дней</option>
        <option value="60">60 дней</option>
        <option value="90">90 дней</option>
      </select>

      <button type="submit" className="btn-primary">
        Применить
      </button>

      {(search || clientStatus || birthDateFrom || birthDateTo || birthdayMonth || membershipExpiresInDays) && (
        <a
          href={resetHref}
          className="inline-flex items-center rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--panel-muted)]"
        >
          Сбросить
        </a>
      )}
    </form>
  );
}
