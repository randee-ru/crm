"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders, getCompanySlugFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-config";
import type {
  GroupProgramRecord,
  GroupScheduleSlotRecord,
  GroupScheduleSlotWriteInput,
  GroupSlotEnrollmentRecord,
  ScheduleSettingsRecord,
  ScheduleSmsIntegrationRecord,
  ScheduleSmsIntegrationWriteInput,
} from "@/lib/types";

async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    const parts: string[] = [];
    for (const [key, value] of Object.entries(payload)) {
      if (key === "detail") continue;
      if (Array.isArray(value)) {
        parts.push(`${key}: ${value.map(String).join(", ")}`);
      } else if (typeof value === "string") {
        parts.push(`${key}: ${value}`);
      }
    }
    if (parts.length > 0) {
      return parts.join("; ");
    }
    return `Ошибка ${response.status}`;
  } catch {
    return `Ошибка ${response.status}`;
  }
}

function toApiTime(value: string): string {
  if (value.length === 5) {
    return `${value}:00`;
  }
  return value;
}

function normalizeSlotPayload(payload: Partial<GroupScheduleSlotWriteInput>): Partial<GroupScheduleSlotWriteInput> {
  const next = { ...payload };
  if (next.start_time) {
    next.start_time = toApiTime(next.start_time);
  }
  if (next.end_time) {
    next.end_time = toApiTime(next.end_time);
  }
  return next;
}

async function scheduleFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const companySlug = await getCompanySlugFromCookie();
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${API_BASE_URL}${path}${separator}company=${encodeURIComponent(companySlug)}`, {
    ...init,
    headers: {
      ...(await getAuthHeaders()),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function listGroupProgramsAction(): Promise<GroupProgramRecord[]> {
  return scheduleFetch<GroupProgramRecord[]>("/api/v1/schedule/programs/");
}

export async function listGroupScheduleSlotsAction(from?: string, to?: string): Promise<GroupScheduleSlotRecord[]> {
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return scheduleFetch<GroupScheduleSlotRecord[]>(`/api/v1/schedule/group-slots/${suffix}`);
}

export async function getScheduleSettingsAction(): Promise<ScheduleSettingsRecord> {
  return scheduleFetch<ScheduleSettingsRecord>("/api/v1/schedule/settings/");
}

export async function updateScheduleSettingsAction(payload: {
  default_max_participants?: number;
  sms_reminder_hours?: number[];
  is_published?: boolean;
  publish_weeks_ahead?: number;
}): Promise<ScheduleSettingsRecord> {
  const result = await scheduleFetch<ScheduleSettingsRecord>("/api/v1/schedule/settings/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/schedule");
  return result;
}

export async function listScheduleSmsIntegrationsAction(): Promise<ScheduleSmsIntegrationRecord[]> {
  return scheduleFetch<ScheduleSmsIntegrationRecord[]>("/api/v1/schedule/sms-integrations/");
}

export async function createScheduleSmsIntegrationAction(
  payload: ScheduleSmsIntegrationWriteInput,
): Promise<ScheduleSmsIntegrationRecord> {
  const result = await scheduleFetch<ScheduleSmsIntegrationRecord>("/api/v1/schedule/sms-integrations/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  revalidatePath("/dashboard/settings");
  return result;
}

export async function updateScheduleSmsIntegrationAction(
  integrationId: number,
  payload: Partial<ScheduleSmsIntegrationWriteInput>,
): Promise<ScheduleSmsIntegrationRecord> {
  const result = await scheduleFetch<ScheduleSmsIntegrationRecord>(
    `/api/v1/schedule/sms-integrations/${integrationId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  revalidatePath("/dashboard/settings");
  return result;
}

export async function deleteScheduleSmsIntegrationAction(integrationId: number): Promise<void> {
  await scheduleFetch<void>(`/api/v1/schedule/sms-integrations/${integrationId}/`, {
    method: "DELETE",
  });
  revalidatePath("/dashboard/settings");
}

export async function createGroupScheduleSlotAction(
  payload: GroupScheduleSlotWriteInput,
): Promise<GroupScheduleSlotRecord> {
  const result = await scheduleFetch<GroupScheduleSlotRecord>("/api/v1/schedule/group-slots/", {
    method: "POST",
    body: JSON.stringify(normalizeSlotPayload(payload)),
  });
  revalidatePath("/dashboard/schedule");
  return result;
}

export async function updateGroupScheduleSlotAction(
  slotId: number,
  payload: Partial<GroupScheduleSlotWriteInput>,
): Promise<GroupScheduleSlotRecord> {
  const result = await scheduleFetch<GroupScheduleSlotRecord>(`/api/v1/schedule/group-slots/${slotId}/`, {
    method: "PATCH",
    body: JSON.stringify(normalizeSlotPayload(payload)),
  });
  revalidatePath("/dashboard/schedule");
  return result;
}

export async function deleteGroupScheduleSlotAction(slotId: number): Promise<void> {
  await scheduleFetch<void>(`/api/v1/schedule/group-slots/${slotId}/`, {
    method: "DELETE",
  });
  revalidatePath("/dashboard/schedule");
}

export async function listSlotEnrollmentsAction(slotId: number): Promise<GroupSlotEnrollmentRecord[]> {
  return scheduleFetch<GroupSlotEnrollmentRecord[]>(`/api/v1/schedule/group-slots/${slotId}/enrollments/`);
}

export async function createSlotEnrollmentAction(
  slotId: number,
  payload: { client: number; notes?: string },
): Promise<GroupSlotEnrollmentRecord> {
  const result = await scheduleFetch<GroupSlotEnrollmentRecord>(
    `/api/v1/schedule/group-slots/${slotId}/enrollments/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  revalidatePath("/dashboard/schedule");
  return result;
}

export async function deleteSlotEnrollmentAction(slotId: number, enrollmentId: number): Promise<void> {
  await scheduleFetch<void>(`/api/v1/schedule/group-slots/${slotId}/enrollments/${enrollmentId}/`, {
    method: "DELETE",
  });
  revalidatePath("/dashboard/schedule");
}
