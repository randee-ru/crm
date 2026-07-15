import type { Metadata } from "next";
import { Suspense } from "react";

import { TelephonyPageClient } from "@/components/telephony/telephony-page-client";
import { WorkspaceCard } from "@/components/workspace-card";
import { getTelephonyDashboard, getTelephonyIntegration } from "@/lib/api";
import type { TelephonyDashboardStats, TelephonyIntegrationRecord } from "@/lib/types";

export const metadata: Metadata = {
  title: "Телефония",
};

const emptyIntegration: TelephonyIntegrationRecord = {
  id: 0,
  provider: "none",
  api_url: "https://app.mango-office.ru/vpbx",
  has_api_key: false,
  has_api_secret: false,
  is_active: true,
  last_synced_at: null,
  settings: {},
};

const emptyDashboard: TelephonyDashboardStats = {
  total_calls: 0,
  today_calls: 0,
  today_answered: 0,
  today_missed: 0,
  with_recording: 0,
  with_transcription: 0,
};

export default async function TelephonyPage() {
  let integration = emptyIntegration;
  let dashboard = emptyDashboard;
  let offline = true;

  try {
    [integration, dashboard] = await Promise.all([getTelephonyIntegration(), getTelephonyDashboard()]);
    offline = false;
  } catch {
    offline = true;
  }

  return (
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="telephony-workspace-card min-w-0 flex-1">
          {offline ? (
            <div className="p-6 text-[13px] text-[var(--muted)]">
              Backend недоступен. Запустите сервер и выполните migrate.
            </div>
          ) : (
            <Suspense fallback={<div className="p-6 text-[13px] text-[var(--muted)]">Загрузка телефонии…</div>}>
              <TelephonyPageClient integration={integration} dashboard={dashboard} />
            </Suspense>
          )}
        </WorkspaceCard>
      </div>
  );
}
