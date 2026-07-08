"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { ActionState } from "@/lib/types";

async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    if (typeof payload.detail === "string") return payload.detail;
    const firstFieldError = Object.values(payload).find(Array.isArray)?.[0];
    if (typeof firstFieldError === "string") return firstFieldError;
  } catch {
    return "Не удалось выполнить запрос.";
  }
  return "Не удалось выполнить запрос.";
}

function readTaskInput(formData: FormData) {
  const clientRaw = String(formData.get("client_id") ?? "").trim();
  const dueRaw = String(formData.get("due_at") ?? "").trim();

  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    status: String(formData.get("status") ?? "open"),
    priority: String(formData.get("priority") ?? "normal"),
    due_at: dueRaw ? new Date(dueRaw).toISOString() : null,
    client_id: clientRaw ? Number(clientRaw) : null,
  };
}

export async function listTasksAction(filters: {
  search?: string;
  status?: string;
  due?: "today" | "overdue";
} = {}) {
  const { getTasks } = await import("@/lib/api");
  return getTasks(undefined, filters);
}

export async function createTaskAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload = readTaskInput(formData);

  if (!payload.title) {
    return { error: "Заголовок задачи обязателен." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/tasks/?company=${encodeURIComponent(companySlug)}`,
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

  const task = (await response.json()) as { id: number };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  redirect(`/dashboard/tasks/${task.id}`);
}

export async function updateTaskAction(
  taskId: number,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companySlug = await getCompanySlugFromCookie();
  const payload = readTaskInput(formData);

  if (!payload.title) {
    return { error: "Заголовок задачи обязателен." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/tasks/${taskId}/?company=${encodeURIComponent(companySlug)}`,
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
  revalidatePath("/dashboard/tasks");
  revalidatePath(`/dashboard/tasks/${taskId}`);
  return { success: "Задача обновлена." };
}
