import Link from "next/link";

type TrainersModuleHeaderProps = {
  total: number;
  activeCount: number;
  branchesCount: number;
};

export function TrainersModuleHeader({ total, activeCount, branchesCount }: TrainersModuleHeaderProps) {
  return (
    <header className="clients-module-header">
      <div className="clients-module-header-main">
        <div>
          <h1 className="clients-module-title">Тренеры</h1>
          <p className="clients-module-subtitle">
            Всего <strong>{total}</strong> · активных <strong>{activeCount}</strong> · филиалов{" "}
            <strong>{branchesCount}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/schedule" className="btn-secondary">
            Расписание
          </Link>
          <Link href="/dashboard/trainers/new" className="clients-module-create">
            + Добавить тренера
          </Link>
        </div>
      </div>
    </header>
  );
}
