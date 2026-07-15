"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { ActionState, ClientRecord, ClientWriteInput } from "@/lib/types";

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
    return "Не удалось выполнить запрос.";
  }

  return "Не удалось выполнить запрос.";
}

function readClientInput(formData: FormData): ClientWriteInput {
  const branchRaw = String(formData.get("branch_id") ?? "").trim();
  const birthDateRaw = String(formData.get("birth_date") ?? "").trim();

  return {
    last_name: String(formData.get("last_name") ?? "").trim(),
    first_name: String(formData.get("first_name") ?? "").trim(),
    middle_name: String(formData.get("middle_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    secondary_phone: String(formData.get("secondary_phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    birth_date: birthDateRaw || null,
    notes: String(formData.get("notes") ?? "").trim(),
    branch_id: branchRaw ? Number(branchRaw) : null,
    is_active: formData.get("is_active") === "on",
    club_access_blocked: formData.get("club_access_blocked") === "on",
    group_programs_blocked: formData.get("group_programs_blocked") === "on",
  };
}

export async function createClientAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload = readClientInput(formData);

  if (!payload.first_name || !payload.last_name || !payload.phone) {
    return { error: "Имя, фамилия и телефон обязательны." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/clients/?company=${encodeURIComponent(companySlug)}`,
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

  const client = (await response.json()) as { id: number };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${client.id}`);
}

export async function createClientQuickAction(
  payload: ClientWriteInput,
): Promise<{ error?: string; client?: ClientRecord }> {
  const companySlug = await getCompanySlugFromCookie();

  if (!payload.first_name || !payload.last_name || !payload.phone) {
    return { error: "Имя, фамилия и телефон обязательны." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/clients/?company=${encodeURIComponent(companySlug)}`,
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

  const client = (await response.json()) as ClientRecord;
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  return { client };
}

export async function updateClientAction(
  clientId: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload = readClientInput(formData);

  if (!payload.first_name || !payload.last_name || !payload.phone) {
    return { error: "Имя, фамилия и телефон обязательны." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/clients/${clientId}/?company=${encodeURIComponent(companySlug)}`,
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

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: "Изменения сохранены." };
}

export async function searchClientOptionsAction(search?: string, ids?: number[]) {
  const { searchClientOptions } = await import("@/lib/api");
  return searchClientOptions(search, ids);
}

export async function listClientsAction(filters: {
  page?: number;
  search?: string;
  clientStatus?: string;
  isActive?: boolean;
  birthDateFrom?: string;
  birthDateTo?: string;
  birthdayMonth?: string;
  membershipExpiresInDays?: string;
  ordering?: string;
}) {
  const { getClientsPaginated } = await import("@/lib/api");
  return getClientsPaginated(undefined, filters);
}
