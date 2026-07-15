"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { ActionState, ClientNoteRecord } from "@/lib/types";

async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    const firstFieldError = Object.values(payload).find(Array.isArray)?.[0];
    if (typeof firstFieldError === "string") return firstFieldError;
  } catch {
    return "Не удалось выполнить запрос.";
  }
  return "Не удалось выполнить запрос.";
}

export async function createClientNoteAction(
  clientId: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Введите текст заметки." };

  const response = await fetch(
    `${API_BASE_URL}/api/v1/clients/${clientId}/notes/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    },
  );
  if (!response.ok) return { error: await parseApiError(response) };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: "Заметка сохранена." };
}

export async function updateClientNoteAction(
  clientId: number,
  noteId: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Введите текст заметки." };

  const response = await fetch(
    `${API_BASE_URL}/api/v1/clients/${clientId}/notes/${noteId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    },
  );
  if (!response.ok) return { error: await parseApiError(response) };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: "Заметка обновлена." };
}

export async function deleteClientNoteAction(clientId: number, noteId: number): Promise<{ error?: string; ok?: boolean }> {
  const companySlug = await getCompanySlugFromCookie();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/clients/${clientId}/notes/${noteId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
  );
  if (!response.ok) return { error: await parseApiError(response) };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return { ok: true };
}

export type { ClientNoteRecord };
