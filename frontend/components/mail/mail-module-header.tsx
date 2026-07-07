import type { ComponentProps } from "react";
import Link from "next/link";

import { driveTopTabs } from "@/lib/nav";

type MailModuleHeaderProps = {
  activeTab?: number;
};

export function MailModuleHeader({ activeTab = 4 }: MailModuleHeaderProps) {
  return (
    <header className="workspace-top-tabs-header">
      <nav className="workspace-top-tabs" aria-label="Совместная работа">
        {driveTopTabs.map((tab, index) => {
          const isActive = index === activeTab;
          const className = `workspace-top-tab ${isActive ? "workspace-top-tab--active" : ""} ${
            tab.stub ? "workspace-top-tab--stub" : ""
          }`;

          if (tab.stub) {
            return (
              <span key={tab.label} className={className} aria-disabled="true">
                {tab.label}
              </span>
            );
          }

          return isActive ? (
            <span key={tab.label} className={className}>
              {tab.label}
            </span>
          ) : (
            <Link key={tab.label} href={tab.href as ComponentProps<typeof Link>["href"]} className={className}>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
