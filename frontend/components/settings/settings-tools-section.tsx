"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";

import { SettingsToggle } from "@/components/settings/settings-toggle";
import {
  SETTINGS_TOOLS_STORAGE_KEY,
  settingsTools,
  type SettingsToolId,
} from "@/lib/settings";

function readStoredTools(): Record<SettingsToolId, boolean> {
  const defaults = Object.fromEntries(
    settingsTools.map((tool) => [tool.id, tool.defaultEnabled]),
  ) as Record<SettingsToolId, boolean>;

  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(SETTINGS_TOOLS_STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function SettingsToolsSection() {
  const [enabledTools, setEnabledTools] = useState<Record<SettingsToolId, boolean>>(() =>
    Object.fromEntries(settingsTools.map((tool) => [tool.id, tool.defaultEnabled])) as Record<
      SettingsToolId,
      boolean
    >,
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ collaboration: true });

  useEffect(() => {
    setEnabledTools(readStoredTools());
  }, []);

  const persist = (next: Record<SettingsToolId, boolean>) => {
    setEnabledTools(next);
    window.localStorage.setItem(SETTINGS_TOOLS_STORAGE_KEY, JSON.stringify(next));
  };

  const enabledCount = useMemo(
    () => Object.values(enabledTools).filter(Boolean).length,
    [enabledTools],
  );

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
        <strong>{enabledCount}</strong> из {settingsTools.length}.{" "}
        <button type="button" className="settings-info-link">
          Подробнее
        </button>
      </div>

      <div className="settings-tool-list">
        {settingsTools.map((tool) => {
          const enabled = enabledTools[tool.id];

          return (
            <div
              key={tool.id}
              className={`settings-tool-row ${enabled ? "" : "settings-tool-row--disabled"}`}
            >
              <SettingsToggle
                enabled={enabled}
                label={tool.label}
                onChange={(value) => persist({ ...enabledTools, [tool.id]: value })}
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
                    <span>Мессенджер</span>
                    <span>Лента</span>
                    <span>Календарь</span>
                  </div>
                ) : null}
              </div>

              {enabled && tool.links ? (
                <div className="settings-tool-links">
                  {tool.links.map((link) =>
                    link.external ? (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="settings-tool-link"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link key={link.label} href={link.href as Route} className="settings-tool-link">
                        {link.label}
                      </Link>
                    ),
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
