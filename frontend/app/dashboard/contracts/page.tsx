import type { Metadata } from "next";

import { ContractsFilters } from "@/components/contracts/contracts-filters";
import { ContractsModuleHeader } from "@/components/contracts/contracts-module-header";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspaceCard } from "@/components/workspace-card";
import { getContracts } from "@/lib/api";

export const metadata: Metadata = {
  title: "Договоры",
};

type ContractsPageProps = {
  searchParams: Promise<{
    search?: string;
    signed?: string;
  }>;
};

export default async function ContractsPage({ searchParams }: ContractsPageProps) {
  const params = await searchParams;
  const signed = params.signed === "1" || params.signed === "0" ? params.signed : undefined;

  let contracts = [] as Awaited<ReturnType<typeof getContracts>>;
  let dataStatus = "offline";

  try {
    contracts = await getContracts({
      search: params.search,
      signed,
    });
    dataStatus = "live";
  } catch {
    dataStatus = "offline";
  }

  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="contracts-workspace-card min-w-0 flex-1">
          <ContractsModuleHeader total={contracts.length} />
          <ContractsFilters search={params.search} signed={params.signed} />
          <ContractsTable
            contracts={contracts}
            emptyMessage={
              dataStatus === "live"
                ? "По текущему фильтру договоры не найдены."
                : "Backend недоступен или сессия истекла. Запустите migrate и seed_demo."
            }
          />
        </WorkspaceCard>
      </div>
    </DashboardShell>
  );
}
