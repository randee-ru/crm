"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { MailAccountRecord, MailMessageRecord } from "@/lib/types";

export async function connectMailAccountAction(input: {
  provider: string;
  email: string;
  displayName?: string;
}): Promise<{ error?: string; account?: MailAccountRecord }> {
  const companySlug = await getCompanySlugFromCookie();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/mail/accounts/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: input.provider,
        email: input.email,
        display_name: input.displayName ?? "",
      }),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { email?: string[]; detail?: string } | null;
    return { error: body?.email?.[0] ?? body?.detail ?? "Не удалось подключить почту." };
  }

  const account = (await response.json()) as MailAccountRecord;
  revalidatePath("/dashboard/mail");
  return { account };
}

export async function sendMailMessageAction(
  accountId: number,
  input: { subject: string; body: string; toEmails: string },
): Promise<{ error?: string; message?: MailMessageRecord }> {
  const companySlug = await getCompanySlugFromCookie();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/mail/accounts/${accountId}/messages/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: input.subject,
        body: input.body,
        to_emails: input.toEmails,
      }),
    },
  );

  if (!response.ok) return { error: "Не удалось отправить письмо." };
  const message = (await response.json()) as MailMessageRecord;
  revalidatePath("/dashboard/mail");
  return { message };
}

export async function markMailReadAction(
  accountId: number,
  messageId: number,
): Promise<{ error?: string }> {
  const companySlug = await getCompanySlugFromCookie();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/mail/accounts/${accountId}/messages/${messageId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_read: true }),
    },
  );
  if (!response.ok) return { error: "Не удалось обновить письмо." };
  revalidatePath("/dashboard/mail");
  return {};
}
