import Link from "next/link";

import { IconCheckCircle } from "@/components/ui/app-icon";

type TelephonyModuleHeaderProps = {
  activeTab: "dashboard" | "calls" | "settings";
  todayCalls?: number;
  synced?: boolean;
  onSync?: () => void;
  syncing?: boolean;
};

const tabs = [
  { id: "dashboard", label: "Дашборд", href: "/dashboard/telephony" },
  { id: "calls", label: "Звонки", href: "/dashboard/telephony?tab=calls" },
  { id: "settings", label: "Настройки", href: "/dashboard/telephony?tab=settings" },
] as const;

export function TelephonyModuleHeader({
  activeTab,
  todayCalls = 0,
  synced = false,
  onSync,
  syncing = false,
}: TelephonyModuleHeaderProps) {
  return (
    <header className="telephony-module-header">
      <div className="telephony-module-header-top">
        <div>
          <p className="telephony-sync-badge">
            {synced ? (
              <>
                <IconCheckCircle size={14} className="telephony-sync-badge-icon" />
                Звонки Mango синхронизированы
              </>
            ) : (
              "Подключите Mango Office в настройках"
            )}
          </p>
          <h1 className="telephony-module-title">Телефония</h1>
        </div>
        {onSync ? (
          <button type="button" className="telephony-sync-btn" onClick={onSync} disabled={syncing}>
            {syncing ? "Синхронизация…" : "Синхронизировать Mango"}
          </button>
        ) : null}
      </div>

      <nav className="telephony-tabs" aria-label="Разделы телефонии">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`telephony-tab${activeTab === tab.id ? " telephony-tab--active" : ""}`}
          >
            {tab.label}
            {tab.id === "calls" && todayCalls > 0 ? ` (${todayCalls})` : ""}
          </Link>
        ))}
      </nav>
    </header>
  );
}
