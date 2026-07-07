"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { ActionState, AttendanceWriteInput } from "@/lib/types";

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
    return "Не удалось сохранить посещение.";
  }
  return "Не удалось сохранить посещение.";
}

function toIsoOrEmpty(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function readInput(formData: FormData): AttendanceWriteInput {
  const clientRaw = String(formData.get("client_id") ?? "").trim();
  const trainerRaw = String(formData.get("trainer_id") ?? "").trim();
  const branchRaw = String(formData.get("branch_id") ?? "").trim();
  const membershipRaw = String(formData.get("membership_id") ?? "").trim();
  const bookingRaw = String(formData.get("booking_id") ?? "").trim();
  const checkedInRaw = String(formData.get("checked_in_at") ?? "").trim();
  const checkedOutRaw = String(formData.get("checked_out_at") ?? "").trim();

  return {
    status: String(formData.get("status") ?? "checked_in"),
    checked_in_at: checkedInRaw ? toIsoOrEmpty(checkedInRaw) : null,
    checked_out_at: checkedOutRaw ? toIsoOrEmpty(checkedOutRaw) : null,
    notes: String(formData.get("notes") ?? "").trim(),
    client_id: clientRaw ? Number(clientRaw) : null,
    trainer_id: trainerRaw ? Number(trainerRaw) : null,
    branch_id: branchRaw ? Number(branchRaw) : null,
    membership_id: membershipRaw ? Number(membershipRaw) : null,
    booking_id: bookingRaw ? Number(bookingRaw) : null,
  };
}

export async function createAttendanceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload = readInput(formData);

  if (!payload.client_id) {
    return { error: "Выберите клиента." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/attendance/?company=${encodeURIComponent(companySlug)}`,
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

  const attendance = (await response.json()) as { id: number };
  revalidatePath("/dashboard/attendance");
  redirect(`/dashboard/attendance/${attendance.id}`);
}

export async function updateAttendanceAction(
  attendanceId: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload = readInput(formData);

  if (!payload.client_id) {
    return { error: "Выберите клиента." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/attendance/${attendanceId}/?company=${encodeURIComponent(companySlug)}`,
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

  revalidatePath("/dashboard/attendance");
  revalidatePath(`/dashboard/attendance/${attendanceId}`);
  return { success: "Посещение сохранено." };
}

export async function deleteAttendanceAction(attendanceId: number): Promise<void> {
  const companySlug = await getCompanySlugFromCookie();
  await fetch(
    `${API_BASE_URL}/api/v1/attendance/${attendanceId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
  );

  revalidatePath("/dashboard/attendance");
  redirect("/dashboard/attendance");
}
