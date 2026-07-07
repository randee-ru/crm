"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { ActionState, StaffInvitationWriteInput, StaffMembershipUpdateInput } from "@/lib/types";

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
    return "Не удалось сохранить изменения.";
  }

  return "Не удалось сохранить изменения.";
}

function readBranchId(formData: FormData): number | null | undefined {
  const raw = String(formData.get("branch_id") ?? "").trim();
  if (!raw) {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function readInvitationInput(formData: FormData): StaffInvitationWriteInput {
  const message = String(formData.get("message") ?? "").trim();
  const expiresAt = String(formData.get("expires_at") ?? "").trim();
  let expiresAtIso: string | null = null;

  if (expiresAt) {
    const parsed = new Date(expiresAt);
    if (!Number.isNaN(parsed.getTime())) {
      expiresAtIso = parsed.toISOString();
    }
  }

  return {
    email: String(formData.get("email") ?? "").trim(),
    full_name: String(formData.get("full_name") ?? "").trim(),
    role: String(formData.get("role") ?? "employee"),
    message,
    expires_at: expiresAtIso,
    branch_id: readBranchId(formData),
  };
}

function readMembershipInput(formData: FormData): StaffMembershipUpdateInput {
  return {
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    role: String(formData.get("role") ?? "employee"),
    is_active: formData.get("is_active") === "on",
    branch_id: readBranchId(formData),
  };
}

export async function inviteEmployeeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload = readInvitationInput(formData);

  if (!payload.full_name || !payload.email) {
    return { error: "Укажите имя и email сотрудника." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/staff/invitations/?company=${encodeURIComponent(companySlug)}`,
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

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/settings?section=employees");
  return { success: "Приглашение отправлено." };
}

export async function updateEmployeeAction(
  membershipId: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload = readMembershipInput(formData);

  if (!payload.first_name || !payload.last_name || !payload.email) {
    return { error: "Имя, фамилия и email обязательны." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/staff/memberships/${membershipId}/?company=${encodeURIComponent(companySlug)}`,
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

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${membershipId}`);
  revalidatePath("/dashboard/settings?section=employees");
  return { success: "Настройки сотрудника обновлены." };
}

export async function cancelInvitationAction(invitationId: number): Promise<void> {
  const companySlug = await getCompanySlugFromCookie();
  await fetch(
    `${API_BASE_URL}/api/v1/staff/invitations/${invitationId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
  );

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/settings?section=employees");
}
