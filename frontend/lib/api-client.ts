"use client";

import { API_BASE_URL } from "@/lib/api-config";
import { AUTH_COMPANY_COOKIE, AUTH_TOKEN_COOKIE, DEFAULT_COMPANY_SLUG } from "@/lib/auth-cookies";
import type { ClientListFilters, ClientRecord, PaginatedResponse } from "@/lib/types";

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function buildClientQuery(companySlug: string, filters: ClientListFilters = {}): string {
  const params = new URLSearchParams({ company: companySlug });

  if (filters.search && filters.search.length >= 3) {
    params.set("search", filters.search);
  }

  if (filters.clientStatus) {
    params.set("client_status", filters.clientStatus);
  }

  if (filters.birthDateFrom) {
    params.set("birth_date_from", filters.birthDateFrom);
  }

  if (filters.birthDateTo) {
    params.set("birth_date_to", filters.birthDateTo);
  }

  if (filters.birthdayMonth) {
    params.set("birthday_month", filters.birthdayMonth);
  }

  if (filters.membershipExpiresInDays) {
    params.set("membership_expires_in_days", filters.membershipExpiresInDays);
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  return params.toString();
}

export async function fetchClientsPaginated(
  filters: ClientListFilters = {},
): Promise<PaginatedResponse<ClientRecord>> {
  const token = readCookie(AUTH_TOKEN_COOKIE);
  const companySlug = readCookie(AUTH_COMPANY_COOKIE) ?? DEFAULT_COMPANY_SLUG;
  const query = buildClientQuery(companySlug, filters);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/clients/?${query}`, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<PaginatedResponse<ClientRecord>>;
}
