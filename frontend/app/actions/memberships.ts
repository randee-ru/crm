"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { ActionState, MembershipWriteInput } from "@/lib/types";

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
    return "Не удалось сохранить абонемент.";
  }
  return "Не удалось сохранить абонемент.";
}

function readInput(formData: FormData): MembershipWriteInput {
  const clientRaw = String(formData.get("client_id") ?? "").trim();
  const branchRaw = String(formData.get("branch_id") ?? "").trim();
  const visitLimitRaw = String(formData.get("visit_limit") ?? "").trim();
  const visitsUsedRaw = String(formData.get("visits_used") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();

  return {
    title: String(formData.get("title") ?? "").trim(),
    status: String(formData.get("status") ?? "draft"),
    starts_at: String(formData.get("starts_at") ?? "").trim(),
    ends_at: String(formData.get("ends_at") ?? "").trim(),
    visit_limit: visitLimitRaw ? Number(visitLimitRaw) : null,
    visits_used: visitsUsedRaw ? Number(visitsUsedRaw) : 0,
    price: priceRaw || "0",
    notes: String(formData.get("notes") ?? "").trim(),
    client_id: clientRaw ? Number(clientRaw) : null,
    branch_id: branchRaw ? Number(branchRaw) : null,
  };
}

export async function createMembershipAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload = readInput(formData);

  if (!payload.title || !payload.starts_at || !payload.ends_at || !payload.client_id) {
    return { error: "Укажите название, клиента и даты абонемента." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/memberships/?company=${encodeURIComponent(companySlug)}`,
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
    return { error: await parseApiError(response) };
  }

  revalidatePath("/dashboard/memberships");
  return { success: "Абонемент создан." };
}

export async function updateMembershipAction(
  membershipId: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload = readInput(formData);

  if (!payload.title || !payload.starts_at || !payload.ends_at) {
    return { error: "Укажите название и даты абонемента." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/memberships/${membershipId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    return { error: await parseApiError(response) };
  }

  revalidatePath("/dashboard/memberships");
  revalidatePath(`/dashboard/memberships/${membershipId}`);
  return { success: "Абонемент сохранён." };
}

export async function deleteMembershipAction(membershipId: number): Promise<void> {
  const companySlug = await getCompanySlugFromCookie();
  await fetch(
    `${API_BASE_URL}/api/v1/memberships/${membershipId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
  );

  revalidatePath("/dashboard/memberships");
  redirect("/dashboard/memberships");
}
