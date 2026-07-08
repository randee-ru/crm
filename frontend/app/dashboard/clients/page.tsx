import type { Metadata } from "next";
import { Suspense } from "react";

import { ClientsListWorkspace } from "@/components/clients/clients-list-workspace";

export const metadata: Metadata = {
  title: "Клиенты",
};

export default function ClientsPage() {
  return (
    <div className="workspace-content min-h-0 flex-1">
      <Suspense fallback={<div className="p-6 text-[13px] text-[var(--muted)]">Загрузка клиентов…</div>}>
        <ClientsListWorkspace totalCount={0} activeCount={0} />
      </Suspense>
    </div>
  );
}
