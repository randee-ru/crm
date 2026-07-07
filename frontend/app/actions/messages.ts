"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { ChatMessageRecord } from "@/lib/types";

export async function sendChatMessageAction(
  roomId: number,
  body: string,
): Promise<{ error?: string; message?: ChatMessageRecord }> {
  const companySlug = await getCompanySlugFromCookie();
  const trimmed = body.trim();

  if (!trimmed) {
    return { error: "Введите текст сообщения." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/chats/${roomId}/messages/?company=${encodeURIComponent(companySlug)}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: trimmed }),
    },
  );

  if (!response.ok) {
    return { error: "Не удалось отправить сообщение." };
  }

  const message = (await response.json()) as ChatMessageRecord;
  revalidatePath("/dashboard/messages");
  return { message };
}
