"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";

import {
  settingsSections,
  type SettingsSectionId,
} from "@/lib/settings";

type SettingsSidebarProps = {
  activeSection: SettingsSectionId;
};

export function SettingsSidebar({ activeSection }: SettingsSidebarProps) {
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return settingsSections;
    return settingsSections.filter((section) =>
      section.label.toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <aside className="settings-sidebar">
      <h1 className="settings-sidebar-title">Настройки</h1>

      <label className="settings-search">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск"
          className="settings-search-input"
        />
      </label>

      <nav className="settings-nav" aria-label="Разделы настроек">
        {filteredSections.map((section) => {
          const href =
            section.id === "tools"
              ? "/dashboard/settings"
              : `/dashboard/settings?section=${section.id}`;
          const isActive = section.id === activeSection;

          return isActive ? (
            <span key={section.id} className="settings-nav-item settings-nav-item--active">
              {section.label}
            </span>
          ) : (
            <Link key={section.id} href={href as Route} className="settings-nav-item">
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className="settings-sidebar-footer">
        <Link href="/dashboard/settings?section=more" className="settings-guide-link">
          Гайд по настройке
        </Link>
      </div>
    </aside>
  );
}
