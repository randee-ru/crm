import Link from "next/link";
import type { ComponentProps } from "react";

type ContractsModuleHeaderProps = {
  total: number;
  createHref?: ComponentProps<typeof Link>["href"];
};

export function ContractsModuleHeader({
  total,
  createHref = "/dashboard/contracts/new",
}: ContractsModuleHeaderProps) {
  return (
    <header className="contracts-module-header">
      <div className="contracts-module-header-main">
        <div>
          <h1 className="contracts-module-title">Договоры</h1>
          <p className="contracts-module-subtitle">Всего {total}</p>
        </div>
        <div className="contracts-module-actions">
          <Link href={createHref} className="contracts-module-create">
            + Создать
          </Link>
        </div>
      </div>
    </header>
  );
}
