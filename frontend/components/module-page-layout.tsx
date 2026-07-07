import type { ReactNode } from "react";

type ModulePageLayoutProps = {
  children: ReactNode;
  sidebar?: ReactNode;
};

export function ModulePageLayout({ children, sidebar }: ModulePageLayoutProps) {
  return (
    <div className="workspace-content min-h-0 flex-1">
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
      {sidebar ? (
        <aside className="hidden w-[272px] shrink-0 space-y-3 xl:block">{sidebar}</aside>
      ) : null}
    </div>
  );
}
