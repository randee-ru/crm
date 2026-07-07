"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import { getDeal } from "@/lib/api";
import type { DealDetail, DealWriteInput } from "@/lib/types";

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

  revalidatePath("/dashboard");
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

  revalidatePath("/dashboard");
  return {};
}

export async function createQuickDealAction(pipelineId: number, stageId: number) {
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

  revalidatePath("/dashboard");
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

  revalidatePath("/dashboard");
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
  revalidatePath("/dashboard");
  return { dealId: created.id };
}
