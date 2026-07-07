"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";

export type StageType = "normal" | "won" | "lost";

export async function updateStageNameAction(
  pipelineId: number,
  stageId: number,
  name: string,
): Promise<{ error?: string }> {
  const companySlug = await getCompanySlugFromCookie();
  const trimmed = name.trim();

  if (!trimmed) {
    return { error: "Название этапа не может быть пустым." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/pipelines/${pipelineId}/stages/${stageId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: trimmed }),
    },
  );

  if (!response.ok) {
    return { error: "Не удалось переименовать этап." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return {};
}

export async function createStageAction(input: {
  pipelineId: number;
  name: string;
  stageType?: StageType;
  color?: string;
  afterStageId?: number | null;
}): Promise<{ error?: string; stageId?: number }> {
  const companySlug = await getCompanySlugFromCookie();
  const name = input.name.trim();

  if (!name) {
    return { error: "Укажите название этапа." };
  }

  const stageType = input.stageType ?? "normal";
  const payload: Record<string, string | number | boolean | null> = {
    name,
    is_won: stageType === "won",
    is_lost: stageType === "lost",
  };

  if (input.color) {
    payload.color = input.color;
  }
  if (input.afterStageId) {
    payload.after_stage_id = input.afterStageId;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/pipelines/${input.pipelineId}/stages/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { name?: string[]; code?: string[]; detail?: string }
      | null;
    return {
      error: body?.name?.[0] ?? body?.code?.[0] ?? body?.detail ?? "Не удалось создать этап.",
    };
  }

  const stage = (await response.json()) as { id: number };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { stageId: stage.id };
}

export async function deleteStageAction(
  pipelineId: number,
  stageId: number,
): Promise<{ error?: string }> {
  const companySlug = await getCompanySlugFromCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/pipelines/${pipelineId}/stages/${stageId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | string[]
      | { detail?: string | string[] }
      | null;
    const detail = Array.isArray(body) ? body[0] : body?.detail;
    const message = Array.isArray(detail) ? detail[0] : detail;
    return { error: message ?? "Не удалось удалить этап." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return {};
}

export async function reorderStagesAction(
  pipelineId: number,
  stageIds: number[],
): Promise<{ error?: string }> {
  const companySlug = await getCompanySlugFromCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/pipelines/${pipelineId}/stages/reorder/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stage_ids: stageIds }),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string | string[]; stage_ids?: string[] }
      | null;
    const detail = body?.stage_ids?.[0] ?? body?.detail;
    const message = Array.isArray(detail) ? detail[0] : detail;
    return { error: message ?? "Не удалось изменить порядок этапов." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return {};
}

export async function createPipelineAction(input: {
  name: string;
  slug?: string;
  isDefault?: boolean;
}): Promise<{ error?: string; pipelineId?: number }> {
  const companySlug = await getCompanySlugFromCookie();
  const name = input.name.trim();

  if (!name) {
    return { error: "Укажите название воронки." };
  }

  const payload: Record<string, string | boolean> = { name };
  const slug = input.slug?.trim();
  if (slug) {
    payload.slug = slug;
  }
  if (input.isDefault) {
    payload.is_default = true;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/pipelines/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { slug?: string[]; name?: string[]; detail?: string }
      | null;
    const slugError = body?.slug?.[0];
    const nameError = body?.name?.[0];
    return { error: slugError ?? nameError ?? body?.detail ?? "Не удалось создать воронку." };
  }

  const pipeline = (await response.json()) as { id: number };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { pipelineId: pipeline.id };
}
