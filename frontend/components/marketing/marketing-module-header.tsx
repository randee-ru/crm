import Link from "next/link";

import { marketingTopTabs } from "@/lib/nav";

type MarketingModuleHeaderProps = {
  activeTab?: string;
};

export function MarketingModuleHeader({ activeTab = "start" }: MarketingModuleHeaderProps) {
  return (
    <header className="marketing-module-header">
      <nav className="marketing-top-tabs" aria-label="Разделы маркетинга">
        {marketingTopTabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const className = `marketing-top-tab ${isActive ? "marketing-top-tab--active" : ""} ${
            tab.stub ? "marketing-top-tab--stub" : ""
          }`;

          if (tab.stub) {
            return (
              <span key={tab.id} className={className} aria-disabled="true">
                {tab.label}
              </span>
            );
          }

          return isActive ? (
            <span key={tab.id} className={className}>
              {tab.label}
            </span>
          ) : (
            <Link key={tab.id} href={tab.href} className={className}>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
