import type { ReactNode } from "react";

import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { settingsSectionMeta, type SettingsSectionId } from "@/lib/settings";

type SettingsLayoutProps = {
  activeSection: SettingsSectionId;
  children: ReactNode;
};

export function SettingsLayout({ activeSection, children }: SettingsLayoutProps) {
  const meta = settingsSectionMeta[activeSection];

  return (
    <div className="settings-page">
      <SettingsSidebar activeSection={activeSection} />
      <div className="settings-main">
        <header className="settings-main-header">
          <h1 className="settings-main-title">{meta.title}</h1>
          <p className="settings-main-description">{meta.description}</p>
        </header>
        {children}
      </div>
    </div>
  );
}
