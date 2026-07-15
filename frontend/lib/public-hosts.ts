/** Хост публичного расписания клиентов. */
export const SCHEDULE_PUBLIC_HOST =
  (process.env.NEXT_PUBLIC_SCHEDULE_HOST || "schedule.sportmax.fit").trim().toLowerCase();

/** Хост личного кабинета клиентов. */
export const CLIENT_LK_HOST =
  (process.env.NEXT_PUBLIC_CLIENT_LK_HOST || "lk.sportmax.fit").trim().toLowerCase();

/** Хост CRM для сотрудников. */
export const CRM_APP_HOST = (process.env.NEXT_PUBLIC_CRM_HOST || "crm.sportmax.fit")
  .trim()
  .toLowerCase();

export function isSchedulePublicHost(host: string | null | undefined): boolean {
  const value = (host || "").split(":")[0].trim().toLowerCase();
  if (!value) return false;
  return value === SCHEDULE_PUBLIC_HOST || value.endsWith(`.${SCHEDULE_PUBLIC_HOST}`);
}

/** @deprecated используйте isSchedulePublicHost */
export function isScheduleLkHost(host: string | null | undefined): boolean {
  return isSchedulePublicHost(host);
}

export function schedulePublicOrigin(): string {
  const configured = (process.env.NEXT_PUBLIC_SCHEDULE_URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");
  return `https://${SCHEDULE_PUBLIC_HOST}`;
}

/** @deprecated используйте schedulePublicOrigin */
export function scheduleLkOrigin(): string {
  return schedulePublicOrigin();
}

export function clientLkOrigin(): string {
  const configured = (process.env.NEXT_PUBLIC_CLIENT_LK_URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");
  return `https://${CLIENT_LK_HOST}`;
}

export function crmAppOrigin(): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");
  return `https://${CRM_APP_HOST}`;
}
