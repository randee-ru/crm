"use server";

import { getCompanySlugFromCookie } from "@/lib/auth";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api";
import type { NotificationRecord } from "@/lib/types";

export async function listNotificationsAction(): Promise<NotificationRecord[]> {
  const companySlug = await getCompanySlugFromCookie();
  return getNotifications(companySlug).catch(() => []);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const companySlug = await getCompanySlugFromCookie();
  await markAllNotificationsRead(companySlug).catch(() => undefined);
}

export async function markNotificationReadAction(notificationId: number): Promise<void> {
  const companySlug = await getCompanySlugFromCookie();
  await markNotificationRead(companySlug, notificationId).catch(() => undefined);
}
