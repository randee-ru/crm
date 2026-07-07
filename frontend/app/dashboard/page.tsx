import type { Metadata } from "next";

import { ClientFilters } from "@/components/client-filters";
import { CrmFunnelSelect } from "@/components/crm-funnel-select";
import { CrmKanbanBoard } from "@/components/crm-kanban-board";
import { CrmModuleHeader } from "@/components/crm-module-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { ModulePageLayout } from "@/components/module-page-layout";
import { WorkspaceCard } from "@/components/workspace-card";
import {
  getBranches,
  getClients,
  getCompanySlug,
  getDeals,
  getPipelines,
} from "@/lib/api";

export const metadata: Metadata = {
  title: "CRM — Сделки",
};

type DashboardPageProps = {
  searchParams: Promise<{
    search?: string;
    client_status?: string;
    pipeline?: string;
    deal?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const preserveQuery = {
    search: params.search,
    pipeline: params.pipeline,
  };

  let companySlug = await getCompanySlug();
  let clients = [] as Awaited<ReturnType<typeof getClients>>;
  let branches = [] as Awaited<ReturnType<typeof getBranches>>;
  let deals = [] as Awaited<ReturnType<typeof getDeals>>;
  let pipelines = [] as Awaited<ReturnType<typeof getPipelines>>;

  try {
    const [clientRows, branchRows, pipelineRows] = await Promise.all([
      getClients(companySlug, { search: params.search, clientStatus: params.client_status }),
      getBranches(companySlug),
      getPipelines(companySlug),
    ]);
    clients = clientRows;
    branches = branchRows;
    pipelines = pipelineRows;

    const activePipeline =
      pipelineRows.find((pipeline) => pipeline.id === Number(params.pipeline)) ??
      pipelineRows.find((pipeline) => pipeline.is_default) ??
      pipelineRows[0];

    if (activePipeline) {
      deals = await getDeals(companySlug, params.search, String(activePipeline.id));
    }
  } catch {
    // offline state handled by empty data
  }

  const activePipeline =
    pipelines.find((pipeline) => pipeline.id === Number(params.pipeline)) ??
    pipelines.find((pipeline) => pipeline.is_default) ??
    pipelines[0];

  return (
    <DashboardShell>
      <ModulePageLayout>
        <WorkspaceCard className="crm-workspace-card">
          <CrmModuleHeader
            title="Сделки"
            crmView="kanban"
            activeTopTab={0}
            activeViewTab={0}
            createHref="/dashboard?view=kanban"
            createLabel="+ Создать"
            preserveQuery={preserveQuery}
            showCreate={false}
            funnel={
              activePipeline ? (
                <CrmFunnelSelect
                  pipelines={pipelines}
                  activePipelineId={activePipeline.id}
                  preserveQuery={preserveQuery}
                />
              ) : undefined
            }
            toolbar={
              <ClientFilters
                view="kanban"
                search={params.search}
                clientStatus={params.client_status}
                resetHref="/dashboard"
              />
            }
          />

          {activePipeline ? (
            <CrmKanbanBoard
              pipeline={activePipeline}
              pipelines={pipelines}
              deals={deals}
              clients={clients}
              branches={branches}
              initialDealId={params.deal ? Number(params.deal) : undefined}
            />
          ) : (
            <div className="px-4 py-8 text-[13px] text-[var(--muted)]">
              Воронка продаж не настроена. Откройте{" "}
              <a href="/dashboard/settings?section=pipelines" className="text-[var(--accent)]">
                настройки воронок
              </a>
              .
            </div>
          )}
        </WorkspaceCard>
      </ModulePageLayout>
    </DashboardShell>
  );
}
