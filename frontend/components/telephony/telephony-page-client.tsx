"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { TelephonyModuleHeader } from "@/components/telephony/telephony-module-header";
import { TelephonyWorkspace } from "@/components/telephony/telephony-workspace";
import { syncMangoCallsAction } from "@/app/actions/telephony";
import type { TelephonyDashboardStats, TelephonyIntegrationRecord } from "@/lib/types";

type TelephonyPageClientProps = {
  integration: TelephonyIntegrationRecord;
  dashboard: TelephonyDashboardStats;
};

export function TelephonyPageClient({ integration, dashboard }: TelephonyPageClientProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "calls" || tabParam === "settings" ? tabParam : "dashboard";

  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSync() {
    setSyncing(true);
    setMessage("");
    try {
      const result = await syncMangoCallsAction();
      setMessage(`Синхронизировано: ${result.synced}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="telephony-page">
      <TelephonyModuleHeader
        activeTab={activeTab}
        todayCalls={dashboard.today_calls}
        synced={Boolean(integration.last_synced_at)}
        onSync={handleSync}
        syncing={syncing}
      />
      {message ? <p className="telephony-message">{message}</p> : null}
      <TelephonyWorkspace integration={integration} dashboard={dashboard} initialTab={activeTab} />
    </div>
  );
}
