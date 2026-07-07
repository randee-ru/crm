import type { Metadata } from "next";
import Link from "next/link";

import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspaceCard } from "@/components/workspace-card";

export const metadata: Metadata = {
  title: "Новый договор",
};

export default function NewContractPage() {
  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="contracts-workspace-card min-w-0 flex-1 p-6">
          <h1 className="text-xl font-semibold text-[var(--text)]">Создание договора</h1>
          <p className="mt-2 text-[14px] text-[var(--muted)]">
            Форма создания договора будет добавлена в следующем обновлении.
          </p>
          <Link href="/dashboard/contracts" className="btn-primary mt-4 inline-flex">
            К списку договоров
          </Link>
        </WorkspaceCard>
      </div>
    </DashboardShell>
  );
}
