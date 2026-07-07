"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { MarketingCampaignRecord, MarketingIntegrationRecord } from "@/lib/types";

export async function connectMarketingIntegrationAction(input: {
  provider: string;
  title?: string;
  settings: Record<string, string>;
}): Promise<{ error?: string; integration?: MarketingIntegrationRecord }> {
  const companySlug = await getCompanySlugFromCookie();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/marketing/integrations/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: input.provider,
        title: input.title ?? "",
        status: "connected",
        settings: input.settings,
        is_active: true,
      }),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: body?.detail ?? "Не удалось подключить сервис." };
  }

  const integration = (await response.json()) as MarketingIntegrationRecord;
  revalidatePath("/dashboard/marketing");
  return { integration };
}

export async function createMarketingCampaignAction(input: {
  channel: string;
  title: string;
  subject?: string;
  body?: string;
  recipientsCount?: number;
  status?: string;
}): Promise<{ error?: string; campaign?: MarketingCampaignRecord }> {
  const companySlug = await getCompanySlugFromCookie();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/marketing/campaigns/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: input.channel,
        title: input.title,
        subject: input.subject ?? "",
        body: input.body ?? "",
        recipients_count: input.recipientsCount ?? 0,
        status: input.status ?? "draft",
      }),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { title?: string[]; detail?: string } | null;
    return { error: body?.title?.[0] ?? body?.detail ?? "Не удалось создать рассылку." };
  }

  const campaign = (await response.json()) as MarketingCampaignRecord;
  revalidatePath("/dashboard/marketing");
  return { campaign };
}

export async function updateMarketingCampaignAction(
  campaignId: number,
  input: { status?: string },
): Promise<{ error?: string }> {
  const companySlug = await getCompanySlugFromCookie();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/marketing/campaigns/${campaignId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) return { error: "Не удалось обновить кампанию." };
  revalidatePath("/dashboard/marketing");
  return {};
}
