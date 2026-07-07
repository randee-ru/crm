import Link from "next/link";
import type { ComponentProps } from "react";

type MembershipsModuleHeaderProps = {
  total: number;
  activeCount: number;
  frozenCount: number;
  expiringSoonCount: number;
  createHref?: ComponentProps<typeof Link>["href"];
};

export function MembershipsModuleHeader({
  total,
  activeCount,
  frozenCount,
  expiringSoonCount,
  createHref = "/dashboard/memberships/new",
}: MembershipsModuleHeaderProps) {
  return (
    <header className="clients-module-header">
      <div className="clients-module-header-main">
        <div>
          <h1 className="clients-module-title">Абонементы</h1>
          <p className="clients-module-subtitle">
            Всего <strong>{total}</strong>
            {activeCount > 0 ? (
              <>
                {" "}
                · активных <strong>{activeCount}</strong>
              </>
            ) : null}
            {frozenCount > 0 ? (
              <>
                {" "}
                · замороженных <strong>{frozenCount}</strong>
              </>
            ) : null}
            {expiringSoonCount > 0 ? (
              <>
                {" "}
                · скоро истекут <strong>{expiringSoonCount}</strong>
              </>
            ) : null}
          </p>
        </div>
        <Link href={createHref} className="clients-module-create">
          + Новый абонемент
        </Link>
      </div>
    </header>
  );
}
