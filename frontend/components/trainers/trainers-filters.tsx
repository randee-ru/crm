import Link from "next/link";

type TrainersFiltersProps = {
  search?: string;
  active?: string;
  type?: string;
  rent?: string;
};

export function TrainersFilters({ search = "", active = "", type = "", rent = "" }: TrainersFiltersProps) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-white px-4 py-3"
    >
      <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[13px] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/15">
        <span className="text-[var(--muted)]">⌕</span>
        <input
          name="search"
          defaultValue={search}
          placeholder="Имя, телефон, email или специализация"
          className="w-full border-0 bg-transparent outline-none"
        />
      </label>

      <select
        name="type"
        defaultValue={type}
        className="form-field w-auto min-w-[170px] bg-white"
        aria-label="Тип тренера"
      >
        <option value="">Все типы</option>
        <option value="gym">Тренажёрный зал</option>
        <option value="group">Групповые программы</option>
      </select>

      <select
        name="rent"
        defaultValue={rent}
        className="form-field w-auto min-w-[170px] bg-white"
        aria-label="Аренда"
      >
        <option value="">Аренда: все</option>
        <option value="unpaid">Не оплачена</option>
        <option value="paid">Оплачена</option>
      </select>

      <select
        name="active"
        defaultValue={active}
        className="form-field w-auto min-w-[150px] bg-white"
        aria-label="Статус тренера"
      >
        <option value="">Все статусы</option>
        <option value="true">Активные</option>
        <option value="false">Неактивные</option>
      </select>

      <button type="submit" className="btn-primary">
        Найти
      </button>

      {search || active || type || rent ? (
        <Link href="/dashboard/trainers" className="btn-secondary">
          Сбросить
        </Link>
      ) : null}
    </form>
  );
}
