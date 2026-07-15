"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import { getTelephonyIntegration } from "@/lib/api";
import type { CallListFilters, CallLogRecord, PaginatedResponse, TelephonyIntegrationRecord } from "@/lib/types";

const AUTO_SYNC_COOLDOWN_MS = 15 * 60 * 1000;

async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail || `Ошибка ${response.status}`;
  } catch {
    return `Ошибка ${response.status}`;
  }
}

async function telephonyFetch<T>(path: string, init?: RequestInit): Promise<T> {
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

  return response.json() as Promise<T>;
}

export async function listCallsAction(
  filters: CallListFilters = {},
): Promise<PaginatedResponse<CallLogRecord>> {
  const companySlug = await getCompanySlugFromCookie();
  const params = new URLSearchParams({ company: companySlug });
  if (filters.period) params.set("period", filters.period);
  if (filters.status) params.set("status", filters.status);
  if (filters.search && filters.search.length >= 3) params.set("search", filters.search);
  if (filters.line) params.set("line", filters.line);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));

  const response = await fetch(`${API_BASE_URL}/api/v1/telephony/calls/?${params.toString()}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json() as Promise<PaginatedResponse<CallLogRecord>>;
}

export async function syncMangoCallsAction(): Promise<{ synced: number; last_synced_at: string | null }> {
  const result = await telephonyFetch<{ synced: number; last_synced_at: string | null }>(
    "/api/v1/telephony/mango/sync/",
    { method: "POST", body: "{}" },
  );
  revalidatePath("/dashboard/telephony");
  return result;
}

export async function maybeAutoSyncMangoAction(): Promise<{ synced: number } | null> {
  const integration = await getTelephonyIntegration().catch(() => null);
  if (
    !integration ||
    integration.provider !== "mango" ||
    !integration.is_active ||
    !integration.has_api_key ||
    !integration.has_api_secret
  ) {
    return null;
  }

  const lastSyncedAt = integration.last_synced_at ? new Date(integration.last_synced_at).getTime() : 0;
  if (lastSyncedAt && Date.now() - lastSyncedAt < AUTO_SYNC_COOLDOWN_MS) {
    return null;
  }

  const result = await syncMangoCallsAction();
  return { synced: result.synced };
}

export async function updateTelephonyIntegrationAction(
  payload: Record<string, unknown>,
): Promise<TelephonyIntegrationRecord> {
  const result = await telephonyFetch<TelephonyIntegrationRecord>("/api/v1/telephony/integration/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  revalidatePath("/dashboard/telephony");
  return result;
}

export async function fetchCallRecordingAction(
  callId: number,
): Promise<{ playback_url: string; title: string; duration: number }> {
  return telephonyFetch(`/api/v1/telephony/calls/${callId}/recording/`, { method: "POST", body: "{}" });
}

export async function transcribeCallAction(
  callId: number,
): Promise<{ transcription_text: string; cached: boolean }> {
  return telephonyFetch(`/api/v1/telephony/calls/${callId}/transcribe/`, { method: "POST", body: "{}" });
}

export async function reportCallAction(callId: number): Promise<{ call_report: string; cached: boolean }> {
  return telephonyFetch(`/api/v1/telephony/calls/${callId}/report/`, { method: "POST", body: "{}" });
}

export async function clickToCallAction(payload: {
  phone: string;
  client_id?: number;
  extension?: string;
}): Promise<{ status: string; extension: string; to_number: string }> {
  return telephonyFetch("/api/v1/telephony/calls/click-to-call/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
