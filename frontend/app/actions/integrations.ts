"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { IntegrationConnectionRecord, IntegrationConnectionWriteInput } from "@/lib/types";

async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    const firstFieldError = Object.values(payload).find(Array.isArray)?.[0];
    if (typeof firstFieldError === "string") {
      return firstFieldError;
    }
  } catch {
    return "Не удалось сохранить интеграцию.";
  }
  return "Не удалось сохранить интеграцию.";
}

async function integrationsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const companySlug = await getCompanySlugFromCookie();
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${API_BASE_URL}${path}${separator}company=${encodeURIComponent(companySlug)}`, {
    ...init,
    headers: {
      ...(await getAuthHeaders()),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function createIntegrationConnectionAction(
  payload: IntegrationConnectionWriteInput,
): Promise<IntegrationConnectionRecord> {
  const result = await integrationsFetch<IntegrationConnectionRecord>("/api/v1/integrations/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  revalidatePath("/dashboard/settings");
  return result;
}

export async function updateIntegrationConnectionAction(
  connectionId: number,
  payload: Partial<IntegrationConnectionWriteInput>,
): Promise<IntegrationConnectionRecord> {
  const result = await integrationsFetch<IntegrationConnectionRecord>(`/api/v1/integrations/${connectionId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  revalidatePath("/dashboard/settings");
  return result;
}

export async function deleteIntegrationConnectionAction(connectionId: number): Promise<void> {
  await integrationsFetch<void>(`/api/v1/integrations/${connectionId}/`, { method: "DELETE" });
  revalidatePath("/dashboard/settings");
}
