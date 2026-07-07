"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { ActionState, BookingWriteInput } from "@/lib/types";

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
    return "Не удалось сохранить бронирование.";
  }

  return "Не удалось сохранить бронирование.";
}

function toIsoOrEmpty(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function readBookingInput(formData: FormData): BookingWriteInput {
  const clientRaw = String(formData.get("client_id") ?? "").trim();
  const trainerRaw = String(formData.get("trainer_id") ?? "").trim();
  const branchRaw = String(formData.get("branch_id") ?? "").trim();
  const membershipRaw = String(formData.get("membership_id") ?? "").trim();

  return {
    title: String(formData.get("title") ?? "").trim(),
    starts_at: toIsoOrEmpty(String(formData.get("starts_at") ?? "").trim()),
    ends_at: toIsoOrEmpty(String(formData.get("ends_at") ?? "").trim()),
    status: String(formData.get("status") ?? "draft"),
    source: String(formData.get("source") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    client_id: clientRaw ? Number(clientRaw) : null,
    trainer_id: trainerRaw ? Number(trainerRaw) : null,
    branch_id: branchRaw ? Number(branchRaw) : null,
    membership_id: membershipRaw ? Number(membershipRaw) : null,
  };
}

export async function createBookingAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload = readBookingInput(formData);

  if (!payload.title || !payload.starts_at || !payload.ends_at) {
    return { error: "Укажите название и время бронирования." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/bookings/?company=${encodeURIComponent(companySlug)}`,
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

  const booking = (await response.json()) as { id: number };
  revalidatePath("/dashboard/bookings");
  redirect(`/dashboard/bookings/${booking.id}`);
}

export async function updateBookingAction(
  bookingId: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload = readBookingInput(formData);

  if (!payload.title || !payload.starts_at || !payload.ends_at) {
    return { error: "Укажите название и время бронирования." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/bookings/${bookingId}/?company=${encodeURIComponent(companySlug)}`,
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

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return { success: "Бронирование сохранено." };
}

export async function deleteBookingAction(bookingId: number): Promise<void> {
  const companySlug = await getCompanySlugFromCookie();
  await fetch(
    `${API_BASE_URL}/api/v1/bookings/${bookingId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
  );

  revalidatePath("/dashboard/bookings");
  redirect("/dashboard/bookings");
}
