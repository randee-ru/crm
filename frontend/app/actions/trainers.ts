"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { ActionState } from "@/lib/types";

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
    return "Не удалось сохранить тренера.";
  }

  return "Не удалось сохранить тренера.";
}

function buildTrainerFormData(formData: FormData): FormData {
  const body = new FormData();
  const branchRaw = String(formData.get("branch_id") ?? "").trim();

  body.append("first_name", String(formData.get("first_name") ?? "").trim());
  body.append("last_name", String(formData.get("last_name") ?? "").trim());
  body.append("phone", String(formData.get("phone") ?? "").trim());
  body.append("email", String(formData.get("email") ?? "").trim());
  body.append("specialization", String(formData.get("specialization") ?? "").trim());
  body.append("achievements", String(formData.get("achievements") ?? "").trim());
  body.append("bio", String(formData.get("bio") ?? "").trim());
  body.append("trains_gym_floor", formData.get("trains_gym_floor") === "on" ? "true" : "false");
  body.append("trains_group_programs", formData.get("trains_group_programs") === "on" ? "true" : "false");
  body.append("is_active", formData.get("is_active") === "on" ? "true" : "false");
  body.append("branch_id", branchRaw);

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    body.append("photo", photo);
  }

  return body;
}

export async function createTrainerAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!firstName || !lastName || !phone) {
    return { error: "Укажите имя, фамилию и телефон тренера." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/trainers/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: await getAuthHeaders(),
      body: buildTrainerFormData(formData),
    },
  );

  if (!response.ok) {
    return { error: await parseApiError(response) };
  }

  const trainer = (await response.json()) as { id: number };
  revalidatePath("/dashboard/trainers");
  redirect(`/dashboard/trainers/${trainer.id}`);
}

export async function updateTrainerAction(
  trainerId: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!firstName || !lastName || !phone) {
    return { error: "Укажите имя, фамилию и телефон тренера." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/trainers/${trainerId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: buildTrainerFormData(formData),
    },
  );

  if (!response.ok) {
    return { error: await parseApiError(response) };
  }

  revalidatePath("/dashboard/trainers");
  revalidatePath(`/dashboard/trainers/${trainerId}`);
  return { success: "Тренер сохранён." };
}

export async function deleteTrainerAction(trainerId: number): Promise<void> {
  const companySlug = await getCompanySlugFromCookie();
  await fetch(
    `${API_BASE_URL}/api/v1/trainers/${trainerId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
  );

  revalidatePath("/dashboard/trainers");
  redirect("/dashboard/trainers");
}

export async function createTrainerRentPaymentAction(
  trainerId: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const paidOn = String(formData.get("paid_at") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!paidOn || !amount) {
    return { error: "Укажите дату и сумму аренды." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/trainers/${trainerId}/rent-payments/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        period: paidOn,
        paid_at: `${paidOn}T12:00:00`,
        amount,
        note,
      }),
    },
  );

  if (!response.ok) {
    return { error: await parseApiError(response) };
  }

  revalidatePath("/dashboard/trainers");
  revalidatePath(`/dashboard/trainers/${trainerId}`);
  return { success: "Оплата аренды отмечена." };
}

export async function deleteTrainerRentPaymentAction(trainerId: number, paymentId: number): Promise<void> {
  const companySlug = await getCompanySlugFromCookie();
  await fetch(
    `${API_BASE_URL}/api/v1/trainers/${trainerId}/rent-payments/${paymentId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
  );

  revalidatePath("/dashboard/trainers");
  revalidatePath(`/dashboard/trainers/${trainerId}`);
}
