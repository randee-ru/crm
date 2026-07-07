import Link from "next/link";
import type { ComponentProps } from "react";

type ClientsModuleHeaderProps = {
  shown: number;
  shownFrom?: number;
  shownTo?: number;
  total: number;
  activeCount?: number;
  createHref?: ComponentProps<typeof Link>["href"];
};

export function ClientsModuleHeader({
  shown,
  shownFrom = 0,
  shownTo = 0,
  total,
  activeCount = 0,
  createHref = "/dashboard/clients/new",
}: ClientsModuleHeaderProps) {
  return (
    <header className="clients-module-header">
      <div className="clients-module-header-main">
        <div>
          <h1 className="clients-module-title">Клиенты</h1>
          <p className="clients-module-subtitle">
            Показано <strong>{shownFrom > 0 ? `${shownFrom}–${shownTo}` : shown}</strong> из {total}
            {activeCount ? (
              <>
                {" "}
                · активных {activeCount}
              </>
            ) : null}
          </p>
        </div>
        <Link href={createHref} className="clients-module-create">
          + Создать
        </Link>
      </div>
    </header>
  );
}
