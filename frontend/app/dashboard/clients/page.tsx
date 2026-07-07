import type { Metadata } from "next";
import { Suspense } from "react";

import { ClientsListWorkspace } from "@/components/clients/clients-list-workspace";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCompanyContext } from "@/lib/api";

export const metadata: Metadata = {
  title: "Клиенты",
};

export default async function ClientsPage() {
  let totalCount = 0;
  let activeCount = 0;

  try {
    const company = await getCompanyContext();
    totalCount = company.clients_count;
    activeCount = company.clients_active_count ?? 0;
  } catch {
    totalCount = 0;
    activeCount = 0;
  }

  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <Suspense fallback={<div className="p-6 text-[13px] text-[var(--muted)]">Загрузка клиентов…</div>}>
          <ClientsListWorkspace totalCount={totalCount} activeCount={activeCount} />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
