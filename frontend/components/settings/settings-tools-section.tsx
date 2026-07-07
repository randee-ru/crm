"use client";

import { useMemo, useState, useTransition } from "react";

import { updateModuleSettingsAction } from "@/app/actions/company";
import { SettingsToggle } from "@/components/settings/settings-toggle";
import { settingsTools } from "@/lib/settings";
import { workspaceNavigation } from "@/lib/nav";

const labelById = Object.fromEntries(workspaceNavigation.map((item) => [item.id, item.label]));

type SettingsToolsSectionProps = {
  initialDisabledModules: string[];
};

export function SettingsToolsSection({ initialDisabledModules }: SettingsToolsSectionProps) {
  const [disabledModules, setDisabledModules] = useState<string[]>(initialDisabledModules);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ collaboration: true });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEnabled = (moduleIds: string[]) => moduleIds.every((id) => !disabledModules.includes(id));

  const enabledCount = useMemo(
    () => settingsTools.filter((tool) => isEnabled(tool.moduleIds)).length,
    [disabledModules],
  );

  function persist(next: string[]) {
    const previous = disabledModules;
    setDisabledModules(next);
    setError(null);
    startTransition(async () => {
      try {
        const saved = await updateModuleSettingsAction(next);
        setDisabledModules(saved);
      } catch (err) {
        setDisabledModules(previous);
        setError(err instanceof Error ? err.message : "Не удалось сохранить настройки меню.");
      }
    });
  }

  function toggleTool(moduleIds: string[], enabled: boolean) {
    const next = enabled
      ? disabledModules.filter((id) => !moduleIds.includes(id))
      : Array.from(new Set([...disabledModules, ...moduleIds]));
    persist(next);
  }

  return (
    <div className="settings-card">
      <div className="settings-card-head">
        <span className="settings-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
          </svg>
        </span>
        <h2 className="settings-card-title">Какие инструменты показывать в меню</h2>
      </div>

      <div className="settings-info-banner">
        Выберите инструменты, которые будут доступны сотрудникам в левом меню. Сейчас включено{" "}
        <strong>{enabledCount}</strong> из {settingsTools.length}.
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>
      ) : null}

      <div className="settings-tool-list">
        {settingsTools.map((tool) => {
          const enabled = isEnabled(tool.moduleIds);

          return (
            <div
              key={tool.id}
              className={`settings-tool-row ${enabled ? "" : "settings-tool-row--disabled"}`}
            >
              <SettingsToggle
                enabled={enabled}
                label={tool.label}
                disabled={isPending}
                onChange={(value) => toggleTool(tool.moduleIds, value)}
              />

              <div className="settings-tool-main">
                {tool.expandable ? (
                  <button
                    type="button"
                    className="settings-tool-expand"
                    onClick={() =>
                      setExpanded((state) => ({ ...state, [tool.id]: !state[tool.id] }))
                    }
                    aria-expanded={expanded[tool.id] ?? false}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 fill-none stroke-current stroke-2 transition ${
                        expanded[tool.id] ? "rotate-180" : ""
                      }`}
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{tool.label}</span>
                  </button>
                ) : (
                  <span className="settings-tool-name">{tool.label}</span>
                )}

                {tool.expandable && expanded[tool.id] ? (
                  <div className="settings-tool-sublist">
                    {tool.moduleIds.map((moduleId) => (
                      <span key={moduleId}>{labelById[moduleId] ?? moduleId}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
