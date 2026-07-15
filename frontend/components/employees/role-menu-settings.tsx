"use client";

import { useMemo, useState, useTransition } from "react";

import { updateRoleModuleSettingsAction } from "@/app/actions/company";
import { SettingsToggle } from "@/components/settings/settings-toggle";
import { workspaceGroupLabels, type WorkspaceGroupId } from "@/lib/access-groups";
import { settingsTools } from "@/lib/settings";
import type { CompanyModuleSettings } from "@/lib/types";

const CONFIGURABLE_ROLES = [
  { id: "admin", label: workspaceGroupLabels.admin },
  { id: "manager", label: workspaceGroupLabels.manager },
  { id: "reception", label: workspaceGroupLabels.reception },
  { id: "user", label: workspaceGroupLabels.user },
] as const satisfies ReadonlyArray<{ id: WorkspaceGroupId; label: string }>;

type RoleMenuSettingsProps = {
  initialSettings: CompanyModuleSettings;
};

export function RoleMenuSettings({ initialSettings }: RoleMenuSettingsProps) {
  const [role, setRole] = useState<(typeof CONFIGURABLE_ROLES)[number]["id"]>("reception");
  const [roleDisabledModules, setRoleDisabledModules] = useState(initialSettings.role_disabled_modules);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentDisabled = roleDisabledModules[role] ?? [];
  const isEnabled = (moduleIds: string[]) => moduleIds.every((id) => !currentDisabled.includes(id));

  const enabledCount = useMemo(
    () => settingsTools.filter((tool) => isEnabled(tool.moduleIds)).length,
    [currentDisabled],
  );

  function toggleTool(moduleIds: string[], enabled: boolean) {
    const previous = roleDisabledModules;
    const next = enabled
      ? currentDisabled.filter((id) => !moduleIds.includes(id))
      : Array.from(new Set([...currentDisabled, ...moduleIds]));
    const nextByRole = { ...roleDisabledModules, [role]: next };
    setRoleDisabledModules(nextByRole);
    setError(null);

    startTransition(async () => {
      try {
        const saved = await updateRoleModuleSettingsAction(role, next);
        setRoleDisabledModules(saved.role_disabled_modules);
      } catch (err) {
        setRoleDisabledModules(previous);
        setError(err instanceof Error ? err.message : "Не удалось сохранить настройки роли.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <h2 className="text-[16px] font-semibold text-[var(--text)]">Что видит группа в меню</h2>
      <p className="mt-1 text-[13px] text-[var(--muted)]">
        Владелец всегда видит полное меню. Для остальных групп можно скрыть лишние разделы,
        чтобы каждому сотруднику показывать только нужные инструменты.
      </p>

      <div className="mt-3 flex gap-2">
        {CONFIGURABLE_ROLES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setRole(option.id)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
              role === option.id
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--panel-muted)] text-[var(--muted)] hover:bg-[#e9eef5]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>
      ) : null}

      <p className="mt-3 text-[12px] text-[var(--muted)]">
        Открыто <strong className="text-[var(--text)]">{enabledCount}</strong> из {settingsTools.length}.
      </p>

      <div className="mt-2 divide-y divide-[var(--line)] rounded-lg border border-[var(--line)]">
        {settingsTools.map((tool) => {
          const enabled = isEnabled(tool.moduleIds);
          return (
            <div key={tool.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-[13px] text-[var(--text)]">{tool.label}</span>
              <SettingsToggle
                enabled={enabled}
                label={tool.label}
                disabled={isPending}
                onChange={(value) => toggleTool(tool.moduleIds, value)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
