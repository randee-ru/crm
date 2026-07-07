import Link from "next/link";

import { messagesTopTabs } from "@/lib/nav";

type MessagesModuleHeaderProps = {
  activeTab?: number;
};

export function MessagesModuleHeader({ activeTab = 0 }: MessagesModuleHeaderProps) {
  return (
    <header className="messages-module-header">
      <nav className="messages-top-tabs" aria-label="Разделы мессенджера">
        {messagesTopTabs.map((tab, index) => {
          const isActive = index === activeTab;
          const className = `messages-top-tab ${isActive ? "messages-top-tab--active" : ""} ${
            tab.stub ? "messages-top-tab--stub" : ""
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
            <Link key={tab.label} href={tab.href} className={className}>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
