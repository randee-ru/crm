import { cache } from "react";

import { API_BASE_URL } from "@/lib/api-config";
import type { AuthSession } from "@/lib/types";
import {
  AUTH_COMPANY_COOKIE,
  AUTH_TOKEN_COOKIE,
  DEFAULT_COMPANY_SLUG,
} from "@/lib/auth-cookies";

export const getAuthToken = cache(async (): Promise<string | undefined> => {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
});

export const getCompanySlugFromCookie = cache(async (): Promise<string> => {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COMPANY_COOKIE)?.value ?? DEFAULT_COMPANY_SLUG;
});

export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  return headers;
}

export const getAuthSession = cache(async (): Promise<AuthSession | null> => {
  const token = await getAuthToken();
  if (!token) {
    return null;
  }

  const companySlug = await getCompanySlugFromCookie();

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/auth/me/?company=${encodeURIComponent(companySlug)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Token ${token}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<AuthSession>;
  } catch {
    return null;
  }
});
