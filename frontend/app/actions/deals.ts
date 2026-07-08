"use server";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import { getDeal } from "@/lib/api";
import type { DealDetail, DealListFilters, DealWriteInput } from "@/lib/types";

export async function getCrmDashboardAction(options: {
  pipelineId?: string;
  search?: string;
  perStage?: number;
} = {}) {
  const { getCrmDashboard } = await import("@/lib/api");
  return getCrmDashboard(undefined, options);
}

export async function getCrmListMetaAction() {
  const { getBranches, getPipelines } = await import("@/lib/api");
  const [pipelines, branches] = await Promise.all([getPipelines(), getBranches()]);
  return { pipelines, branches };
}

export async function getDealAction(dealId: number): Promise<DealDetail> {
  return getDeal(dealId);
}

export async function updateDealStageAction(dealId: number, stageId: number) {
  const companySlug = await getCompanySlugFromCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/deals/${dealId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stage_id: stageId }),
    },
  );

  if (!response.ok) {
    throw new Error("Не удалось переместить сделку.");
  }
}

export async function getCrmFunnelAnalyticsAction(pipelineSlug: string) {
  const { getCrmFunnelAnalytics } = await import("@/lib/api");
  return getCrmFunnelAnalytics(pipelineSlug);
}

export async function listDealsAction(filters: DealListFilters = {}) {
  const { getDealsPaginated } = await import("@/lib/api");
  return getDealsPaginated(undefined, filters);
}

export async function loadKanbanStageDealsAction(
  pipelineId: number,
  stageId: number,
  offset: number,
  search?: string,
  limit = 15,
) {
  const { getKanbanStageDeals } = await import("@/lib/api");
  return getKanbanStageDeals(pipelineId, stageId, offset, { search, limit });
}

export async function updateDealAction(
  dealId: number,
  data: DealWriteInput,
): Promise<{ error?: string }> {
  const companySlug = await getCompanySlugFromCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/deals/${dealId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    return { error: "Не удалось сохранить сделку." };
  }

  return {};
}

export async function createQuickDealAction(
  pipelineId: number,
  stageId: number,
): Promise<import("@/lib/types").DealRecord> {
  const companySlug = await getCompanySlugFromCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/deals/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Быстрая сделка",
        amount: "0",
        pipeline_id: pipelineId,
        stage_id: stageId,
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Не удалось создать сделку.");
  }

  return response.json() as Promise<import("@/lib/types").DealRecord>;
}

export async function deleteDealAction(dealId: number): Promise<{ error?: string }> {
  const companySlug = await getCompanySlugFromCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/deals/${dealId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
  );

  if (!response.ok) {
    return { error: "Не удалось удалить сделку." };
  }

  return {};
}

export async function copyDealAction(dealId: number): Promise<{ error?: string; dealId?: number }> {
  const companySlug = await getCompanySlugFromCookie();

  let source: DealDetail;
  try {
    source = await getDeal(dealId, companySlug);
  } catch {
    return { error: "Не удалось загрузить сделку для копирования." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/deals/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `${source.title} (копия)`,
        amount: source.amount,
        pipeline_id: source.pipeline_id,
        stage_id: source.stage_id,
        client_id: source.client_id,
        branch_id: source.branch_id,
      }),
    },
  );

  if (!response.ok) {
    return { error: "Не удалось скопировать сделку." };
  }

  const created = (await response.json()) as { id: number };
  return { dealId: created.id };
}
