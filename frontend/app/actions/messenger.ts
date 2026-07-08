"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type { MessengerChannelProvider } from "@/lib/messenger";
import type {
  MessengerAccountRecord,
  MessengerIntegrationRecord,
  MessengerMessageRecord,
  MessengerThreadRecord,
} from "@/lib/types";

const MESSAGES_PATH = "/dashboard/messages";

async function companyQuery() {
  const companySlug = await getCompanySlugFromCookie();
  return `company=${encodeURIComponent(companySlug)}`;
}

export async function getMessengerIntegrationAction(
  provider: string,
): Promise<MessengerIntegrationRecord | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/integrations/?${await companyQuery()}&provider=${encodeURIComponent(provider)}`,
    {
      headers: await getAuthHeaders(),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as MessengerIntegrationRecord[];
  return data[0] ?? null;
}

export async function saveMessengerIntegrationAction(
  provider: string,
  payload: { bot_token?: string; webhook_secret?: string; is_active?: boolean },
): Promise<{ error?: string; integration?: MessengerIntegrationRecord }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/integrations/?${await companyQuery()}&provider=${encodeURIComponent(provider)}`,
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
    return { error: "Не удалось сохранить настройки." };
  }

  const integration = (await response.json()) as MessengerIntegrationRecord;
  revalidatePath(MESSAGES_PATH);
  return { integration };
}

export async function sendMessengerMessageAction(
  threadId: number,
  body: string,
): Promise<{ error?: string; message?: MessengerMessageRecord }> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { error: "Введите текст сообщения." };
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/threads/${threadId}/messages/?${await companyQuery()}`,
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
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: data?.detail || "Не удалось отправить сообщение." };
  }

  const message = (await response.json()) as MessengerMessageRecord;
  revalidatePath(MESSAGES_PATH);
  return { message };
}

export async function markMessengerThreadReadAction(threadId: number): Promise<void> {
  await fetch(
    `${API_BASE_URL}/api/v1/channels/threads/${threadId}/read/?${await companyQuery()}`,
    {
      method: "POST",
      headers: await getAuthHeaders(),
    },
  );
  revalidatePath(MESSAGES_PATH);
}

export async function getMessengerGatewayAccountAction(
  provider: string,
): Promise<MessengerAccountRecord | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/?${await companyQuery()}&provider=${encodeURIComponent(provider)}`,
    {
      headers: await getAuthHeaders(),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as MessengerAccountRecord[];
  return data[0] ?? null;
}

export async function refreshMessengerGatewayAccountAction(
  accountId: number,
): Promise<{ error?: string; account?: MessengerAccountRecord }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/${accountId}/?${await companyQuery()}`,
    {
      headers: await getAuthHeaders(),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    return { error: "Не удалось обновить статус аккаунта." };
  }
  const account = (await response.json()) as MessengerAccountRecord;
  revalidatePath(MESSAGES_PATH);
  return { account };
}

export async function createMessengerGatewayAccountAction(
  provider: string,
  payload: { label?: string; phone?: string } = {},
): Promise<{ error?: string; account?: MessengerAccountRecord }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/?${await companyQuery()}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ provider, ...payload }),
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: data?.detail || "Не удалось создать подключение." };
  }

  const account = (await response.json()) as MessengerAccountRecord;
  revalidatePath(MESSAGES_PATH);
  return { account };
}

export async function submitMessengerGatewayCodeAction(
  accountId: number,
  code: string,
  provider: "telegram" | "max",
): Promise<{ error?: string; account?: MessengerAccountRecord }> {
  const endpoint =
    provider === "max"
      ? `max-code`
      : "telegram-code";
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/${accountId}/${endpoint}/?${await companyQuery()}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: data?.detail || "Неверный код." };
  }

  const account = (await response.json()) as MessengerAccountRecord;
  revalidatePath(MESSAGES_PATH);
  return { account };
}

export async function submitMessengerGatewayPasswordAction(
  accountId: number,
  password: string,
  provider: "telegram" | "max",
): Promise<{ error?: string; account?: MessengerAccountRecord }> {
  const endpoint =
    provider === "max"
      ? `max-password`
      : "telegram-password";
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/${accountId}/${endpoint}/?${await companyQuery()}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: data?.detail || "Неверный пароль." };
  }

  const account = (await response.json()) as MessengerAccountRecord;
  revalidatePath(MESSAGES_PATH);
  return { account };
}

export async function disconnectMessengerGatewayAccountAction(
  accountId: number,
): Promise<{ error?: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/${accountId}/?${await companyQuery()}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
  );

  if (!response.ok && response.status !== 204) {
    return { error: "Не удалось отключить аккаунт." };
  }

  revalidatePath(MESSAGES_PATH);
  return {};
}

export async function getMessengerAccountAction(
  provider: string,
): Promise<MessengerAccountRecord | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/?${await companyQuery()}&provider=${encodeURIComponent(provider)}`,
    {
      headers: await getAuthHeaders(),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as MessengerAccountRecord[];
  return data[0] ?? null;
}

export async function createMessengerAccountAction(
  provider: MessengerChannelProvider,
  payload: { label?: string; phone?: string } = {},
): Promise<{ error?: string; account?: MessengerAccountRecord }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/?${await companyQuery()}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ provider, ...payload }),
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: data?.detail || "Не удалось начать подключение." };
  }

  const account = (await response.json()) as MessengerAccountRecord;
  revalidatePath(MESSAGES_PATH);
  return { account };
}

export async function refreshMessengerAccountAction(
  accountId: number,
): Promise<{ error?: string; account?: MessengerAccountRecord }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/${accountId}/?${await companyQuery()}`,
    {
      headers: await getAuthHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return { error: "Не удалось обновить статус подключения." };
  }

  const account = (await response.json()) as MessengerAccountRecord;
  revalidatePath(MESSAGES_PATH);
  return { account };
}

export async function submitMessengerTelegramCodeAction(
  accountId: number,
  code: string,
): Promise<{ error?: string; account?: MessengerAccountRecord }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/${accountId}/telegram-code/?${await companyQuery()}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: data?.detail || "Неверный код." };
  }

  const account = (await response.json()) as MessengerAccountRecord;
  revalidatePath(MESSAGES_PATH);
  return { account };
}

export async function submitMessengerTelegramPasswordAction(
  accountId: number,
  password: string,
): Promise<{ error?: string; account?: MessengerAccountRecord }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/${accountId}/telegram-password/?${await companyQuery()}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: data?.detail || "Неверный пароль." };
  }

  const account = (await response.json()) as MessengerAccountRecord;
  revalidatePath(MESSAGES_PATH);
  return { account };
}

export async function submitMessengerMaxCodeAction(
  accountId: number,
  code: string,
): Promise<{ error?: string; account?: MessengerAccountRecord }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/${accountId}/max-code/?${await companyQuery()}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: data?.detail || "Неверный код." };
  }

  const account = (await response.json()) as MessengerAccountRecord;
  revalidatePath(MESSAGES_PATH);
  return { account };
}

export async function submitMessengerMaxPasswordAction(
  accountId: number,
  password: string,
): Promise<{ error?: string; account?: MessengerAccountRecord }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/${accountId}/max-password/?${await companyQuery()}`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: data?.detail || "Неверный пароль." };
  }

  const account = (await response.json()) as MessengerAccountRecord;
  revalidatePath(MESSAGES_PATH);
  return { account };
}

export async function disconnectMessengerAccountAction(accountId: number): Promise<{ error?: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/channels/gateway/accounts/${accountId}/?${await companyQuery()}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
  );

  if (!response.ok && response.status !== 204) {
    return { error: "Не удалось отключить аккаунт." };
  }

  revalidatePath(MESSAGES_PATH);
  return {};
}
