export type WorkspaceGroupId = "admin" | "manager" | "reception" | "user";

export const workspaceGroupOptions = [
  { value: "admin", label: "Админы" },
  { value: "manager", label: "Менеджеры" },
  { value: "reception", label: "Ресепшен" },
  { value: "user", label: "Пользователи" },
] as const satisfies ReadonlyArray<{ value: WorkspaceGroupId; label: string }>;

export const workspaceGroupLabels: Record<string, string> = {
  owner: "Владелец",
  admin: "Админы",
  manager: "Менеджеры",
  reception: "Ресепшен",
  user: "Пользователи",
  employee: "Ресепшен",
  staff: "Пользователи",
};

const legacyGroupMap: Record<string, WorkspaceGroupId> = {
  employee: "reception",
  staff: "user",
};

export function normalizeWorkspaceGroupId(group?: string | null): WorkspaceGroupId | "" {
  if (!group) {
    return "";
  }

  const normalized = legacyGroupMap[group] ?? (group as WorkspaceGroupId | string);
  return normalized === "admin" || normalized === "manager" || normalized === "reception" || normalized === "user"
    ? normalized
    : "";
}
