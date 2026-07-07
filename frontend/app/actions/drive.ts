"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";

export async function createDriveFolderAction(input: {
  name: string;
  parentId?: number | null;
}): Promise<{ error?: string }> {
  const companySlug = await getCompanySlugFromCookie();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/drive/items/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item_type: "folder",
        name: input.name,
        parent_id: input.parentId ?? null,
      }),
    },
  );
  if (!response.ok) return { error: "Не удалось создать папку." };
  revalidatePath("/dashboard/drive");
  return {};
}

export async function createDriveFileAction(input: {
  name: string;
  parentId?: number | null;
  content?: string;
}): Promise<{ error?: string }> {
  const companySlug = await getCompanySlugFromCookie();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/drive/items/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item_type: "file",
        name: input.name,
        parent_id: input.parentId ?? null,
        content: input.content ?? "",
      }),
    },
  );
  if (!response.ok) return { error: "Не удалось создать файл." };
  revalidatePath("/dashboard/drive");
  return {};
}

export async function deleteDriveItemAction(itemId: number): Promise<{ error?: string }> {
  const companySlug = await getCompanySlugFromCookie();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/drive/items/${itemId}/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
  );
  if (!response.ok) return { error: "Не удалось удалить элемент." };
  revalidatePath("/dashboard/drive");
  return {};
}
