"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getCrmDashboardAction } from "@/app/actions/deals";
import { ClientFilters } from "@/components/client-filters";
import { CrmDealsListWorkspace } from "@/components/crm-deals-list-workspace";
import { CrmFunnelAnalytics } from "@/components/crm-funnel-analytics";
import { CrmFunnelSelect } from "@/components/crm-funnel-select";
import { CrmKanbanBoard } from "@/components/crm-kanban-board";
import { CrmModuleHeader } from "@/components/crm-module-header";
import { WorkspaceCard } from "@/components/workspace-card";
import type { BranchOption, CrmDashboardResponse, DealPipelineRecord } from "@/lib/types";

type CrmDashboardWorkspaceProps = {
  initialDealId?: number;
};

function KanbanSkeleton() {
  return (
    <div className="crm-kanban-board crm-kanban-board--loading">
      <div className="crm-kanban-scroll">
        {Array.from({ length: 5 }).map((_, index) => (
          <section key={index} className="crm-kanban-column crm-kanban-column--skeleton">
            <div className="crm-skeleton-line crm-skeleton-line--title" />
            <div className="crm-skeleton-line" />
            <div className="crm-skeleton-line" />
          </section>
        ))}
      </div>
    </div>
  );
}

export function CrmDashboardWorkspace({ initialDealId }: CrmDashboardWorkspaceProps) {
  const searchParams = useSearchParams();
  const isListView = searchParams.get("view") === "list";
  const search = searchParams.get("search") || undefined;
  const pipelineId = searchParams.get("pipeline") || undefined;

  const [dashboard, setDashboard] = useState<CrmDashboardResponse | null>(null);
  const [pipelines, setPipelines] = useState<DealPipelineRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(!isListView);
  const [error, setError] = useState<string | null>(null);

  const preserveQuery = {
    search,
    pipeline: pipelineId,
    ...(isListView ? { view: "list" as const } : {}),
  };

  useEffect(() => {
    if (isListView) {
      let cancelled = false;
      async function loadListMeta() {
        setLoading(true);
        setError(null);
        try {
          const { getCrmListMetaAction } = await import("@/app/actions/deals");
          const meta = await getCrmListMetaAction();
          if (!cancelled) {
            setPipelines(meta.pipelines);
            setBranches(meta.branches);
          }
        } catch (loadError) {
          if (!cancelled) {
            setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить CRM");
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }
      void loadListMeta();
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getCrmDashboardAction({
          pipelineId,
          search,
          perStage: 15,
        });
        if (!cancelled) {
          setDashboard(data);
          setPipelines(data.pipelines);
          setBranches(data.branches);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить CRM");
          setDashboard(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isListView, pipelineId, search]);

  const activePipeline =
    dashboard?.active_pipeline ??
    pipelines.find((pipeline) => pipeline.id === Number(pipelineId)) ??
    pipelines[0] ??
    null;

  const pipelinesWithCounts =
    dashboard && activePipeline
      ? dashboard.pipelines.map((pipeline) =>
          pipeline.id === activePipeline.id ? activePipeline : pipeline,
        )
      : pipelines;

  const analyticsTitle =
    activePipeline?.slug === "membership-renewal" ? "Воронка продления" : "Общая воронка";

  return (
    <WorkspaceCard className="crm-workspace-card">
      <CrmModuleHeader
        title="Сделки"
        crmView={isListView ? "list" : "kanban"}
        activeTopTab={0}
        activeViewTab={isListView ? 1 : 0}
        createHref="/dashboard?view=kanban"
        createLabel="+ Создать"
        preserveQuery={preserveQuery}
        showCreate={false}
        funnel={
          activePipeline ? (
            <CrmFunnelSelect
              pipelines={pipelinesWithCounts}
              activePipelineId={activePipeline.id}
              preserveQuery={preserveQuery}
            />
          ) : loading ? (
            <button type="button" className="crm-funnel-select" disabled>
              <span>Загрузка…</span>
            </button>
          ) : undefined
        }
        toolbar={
          isListView ? null : (
            <ClientFilters
              view="kanban"
              search={search}
              resetHref="/dashboard"
            />
          )
        }
      />

      {!isListView && dashboard?.analytics_summary && activePipeline ? (
        <CrmFunnelAnalytics
          summary={dashboard.analytics_summary}
          pipelineSlug={activePipeline.slug}
          title={analyticsTitle}
        />
      ) : null}

      {isListView ? (
        loading ? (
          <div className="px-4 py-8 text-[13px] text-[var(--muted)]">Загрузка списка…</div>
        ) : activePipeline ? (
          <CrmDealsListWorkspace
            pipelines={pipelinesWithCounts.length ? pipelinesWithCounts : [activePipeline]}
            activePipelineId={activePipeline.id}
            branches={branches}
            initialDealId={initialDealId}
          />
        ) : (
          <div className="px-4 py-8 text-[13px] text-[var(--muted)]">
            {error ?? "Воронка не найдена."}
          </div>
        )
      ) : loading ? (
        <KanbanSkeleton />
      ) : activePipeline ? (
        <CrmKanbanBoard
          pipeline={activePipeline}
          pipelines={pipelinesWithCounts}
          deals={dashboard?.deals ?? []}
          branches={branches}
          perStage={dashboard?.per_stage ?? 15}
          search={search}
          initialDealId={initialDealId}
        />
      ) : (
        <div className="px-4 py-8 text-[13px] text-[var(--muted)]">
          {error ? (
            <>
              {error}. Убедитесь, что backend запущен на порту 8000, и обновите страницу.
            </>
          ) : (
            <>
              Воронка продаж не настроена. Откройте{" "}
              <a href="/dashboard/settings?section=pipelines" className="text-[var(--accent)]">
                настройки воронок
              </a>
              .
            </>
          )}
        </div>
      )}
    </WorkspaceCard>
  );
}
