"use client";

import { API_BASE_URL } from "@/lib/api-config";
import { AUTH_COMPANY_COOKIE, AUTH_TOKEN_COOKIE, DEFAULT_COMPANY_SLUG } from "@/lib/auth-cookies";
import type { CallListFilters, CallLogRecord, PaginatedResponse, TelephonyIntegrationRecord } from "@/lib/types";

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function telephonyRequest<T>(path: string, init?: RequestInit, extraParams?: Record<string, string>): Promise<T> {
  const token = readCookie(AUTH_TOKEN_COOKIE);
  const companySlug = readCookie(AUTH_COMPANY_COOKIE) ?? DEFAULT_COMPANY_SLUG;
  const params = new URLSearchParams({ company: companySlug, ...(extraParams ?? {}) });
  const url = `${API_BASE_URL}${path}?${params.toString()}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Token ${token}`;
  if (init?.body) headers["Content-Type"] = "application/json";

  const response = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error((payload as { detail?: string }).detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function callFiltersToParams(filters: CallListFilters = {}): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.period) params.period = filters.period;
  if (filters.status) params.status = filters.status;
  if (filters.search && filters.search.length >= 3) params.search = filters.search;
  if (filters.page && filters.page > 1) params.page = String(filters.page);
  return params;
}

export async function fetchCallsPaginated(filters: CallListFilters = {}): Promise<PaginatedResponse<CallLogRecord>> {
  return telephonyRequest<PaginatedResponse<CallLogRecord>>("/api/v1/telephony/calls/", undefined, callFiltersToParams(filters));
}

export async function syncMangoCalls(): Promise<{ synced: number; last_synced_at: string | null }> {
  return telephonyRequest("/api/v1/telephony/mango/sync/", { method: "POST", body: "{}" });
}

export async function updateTelephonyIntegration(payload: Record<string, unknown>): Promise<TelephonyIntegrationRecord> {
  return telephonyRequest<TelephonyIntegrationRecord>("/api/v1/telephony/integration/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchCallRecording(callId: number): Promise<{ url: string }> {
  return telephonyRequest(`/api/v1/telephony/calls/${callId}/recording/`, { method: "POST", body: "{}" });
}

export async function transcribeCall(callId: number): Promise<{ transcription_text: string; cached: boolean }> {
  return telephonyRequest(`/api/v1/telephony/calls/${callId}/transcribe/`, { method: "POST", body: "{}" });
}

export async function reportCall(callId: number): Promise<{ call_report: string; cached: boolean }> {
  return telephonyRequest(`/api/v1/telephony/calls/${callId}/report/`, { method: "POST", body: "{}" });
}
