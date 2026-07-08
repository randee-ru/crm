"use server";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type {
  DealContactHistoryRecord,
  DealContactWriteInput,
  DealTaskRecord,
  TaskWriteInput,
} from "@/lib/types";

async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    if (typeof payload.detail === "string") return payload.detail;
    const firstFieldError = Object.values(payload).find(Array.isArray)?.[0];
    if (typeof firstFieldError === "string") return firstFieldError;
  } catch {
    return "Не удалось выполнить запрос.";
  }
  return "Не удалось выполнить запрос.";
}

export async function createDealContactAction(
  dealId: number,
  data: DealContactWriteInput,
): Promise<{ error?: string; contact?: DealContactHistoryRecord }> {
  const companySlug = await getCompanySlugFromCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/deals/${dealId}/contacts/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    return { error: await parseApiError(response) };
  }

  const contact = (await response.json()) as DealContactHistoryRecord;
  return { contact };
}

export async function createDealCommentAction(
  dealId: number,
  comment: string,
): Promise<{ error?: string; contact?: DealContactHistoryRecord }> {
  if (!comment.trim()) {
    return { error: "Введите текст комментария." };
  }

  return createDealContactAction(dealId, {
    contact_type: "note",
    comment: comment.trim(),
  });
}

export async function createDealTaskAction(
  dealId: number,
  data: Pick<TaskWriteInput, "title" | "due_at" | "description">,
  clientId?: number | null,
): Promise<{ error?: string; task?: DealTaskRecord }> {
  const companySlug = await getCompanySlugFromCookie();

  if (!data.title.trim()) {
    return { error: "Введите название задачи." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/tasks/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: data.title.trim(),
        description: data.description?.trim() || "",
        due_at: data.due_at || null,
        deal_id: dealId,
        client_id: clientId ?? null,
        status: "open",
        priority: "normal",
      }),
    },
  );

  if (!response.ok) {
    return { error: await parseApiError(response) };
  }

  const task = (await response.json()) as DealTaskRecord;
  return { task };
}

export async function updateDealTaskStatusAction(
  taskId: number,
  status: "open" | "done",
): Promise<{ error?: string; task?: DealTaskRecord }> {
  const companySlug = await getCompanySlugFromCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/tasks/${taskId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    return { error: await parseApiError(response) };
  }

  const task = (await response.json()) as DealTaskRecord;
  return { task };
}
