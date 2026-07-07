"use server";

import { revalidatePath } from "next/cache";

import { getAuthToken } from "@/lib/auth";
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
    return "Не удалось сохранить профиль.";
  }

  return "Не удалось сохранить профиль.";
}

export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = await getAuthToken();
  if (!token) {
    return { error: "Требуется авторизация." };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!firstName || !lastName) {
    return { error: "Имя и фамилия обязательны." };
  }

  if (!email) {
    return { error: "Email обязателен." };
  }

  const body = new FormData();
  body.append("first_name", firstName);
  body.append("last_name", lastName);
  body.append("email", email);

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    body.append("avatar", avatar);
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me/`, {
    method: "PATCH",
    headers: {
      Authorization: `Token ${token}`,
    },
    body,
  });

  if (!response.ok) {
    return { error: await parseApiError(response) };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/profile");

  return { success: "Изменения сохранены." };
}
