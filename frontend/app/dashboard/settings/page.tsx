import type { Metadata } from "next";
import Link from "next/link";

import { DashboardShell } from "@/components/dashboard-shell";
import { SettingsIntegrationsSection } from "@/components/settings/settings-integrations-section";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { SettingsPipelinesSection } from "@/components/settings/settings-pipelines-section";
import { SettingsScheduleSection } from "@/components/settings/settings-schedule-section";
import { SettingsToolsSection } from "@/components/settings/settings-tools-section";
import { getAuthSession } from "@/lib/auth";
import {
  getIntegrationConnections,
  getMarketingIntegrations,
  getPipelines,
  getScheduleSettings,
  getScheduleSmsIntegrations,
  getTelephonyIntegration,
} from "@/lib/api";
import { settingsSectionMeta, type SettingsSectionId } from "@/lib/settings";

export const metadata: Metadata = { title: "Настройки" };

type SettingsPageProps = {
  searchParams: Promise<{
    section?: string;
  }>;
};

function resolveSection(section?: string): SettingsSectionId {
  if (section && section in settingsSectionMeta) {
    return section as SettingsSectionId;
  }
  return "tools";
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const section = resolveSection(params.section);
  let pipelines = [] as Awaited<ReturnType<typeof getPipelines>>;
  let scheduleSettings = null as Awaited<ReturnType<typeof getScheduleSettings>> | null;
  let scheduleSmsIntegrations = [] as Awaited<ReturnType<typeof getScheduleSmsIntegrations>>;
  let disabledModules: string[] = [];

  if (section === "tools") {
    const session = await getAuthSession();
    disabledModules = session?.company?.disabled_modules ?? [];
  }

  if (section === "pipelines") {
    try {
      pipelines = await getPipelines();
    } catch {
      pipelines = [];
    }
  }

  if (section === "schedule" || section === "integrations") {
    try {
      scheduleSmsIntegrations = await getScheduleSmsIntegrations();
    } catch {
      scheduleSmsIntegrations = [];
    }
  }

  if (section === "schedule") {
    try {
      scheduleSettings = await getScheduleSettings();
    } catch {
      scheduleSettings = {
        default_max_participants: 20,
        sms_reminder_hours: [24, 2],
        is_published: false,
        publish_weeks_ahead: 4,
        embed_token: "",
        updated_at: new Date().toISOString(),
      };
    }
  }

  let telephonyIntegration = null as Awaited<ReturnType<typeof getTelephonyIntegration>> | null;
  let marketingIntegrations = [] as Awaited<ReturnType<typeof getMarketingIntegrations>>;
  let integrationConnections = [] as Awaited<ReturnType<typeof getIntegrationConnections>>;

  if (section === "integrations") {
    [telephonyIntegration, marketingIntegrations, integrationConnections] = await Promise.all([
      getTelephonyIntegration().catch(() => null),
      getMarketingIntegrations().catch(() => []),
      getIntegrationConnections().catch(() => []),
    ]);
  }

  return (
    <DashboardShell>
      <SettingsLayout activeSection={section}>
        {section === "tools" ? (
          <SettingsToolsSection initialDisabledModules={disabledModules} />
        ) : section === "pipelines" ? (
          <SettingsPipelinesSection initialPipelines={pipelines} />
        ) : section === "schedule" && scheduleSettings ? (
          <SettingsScheduleSection
            initialSettings={scheduleSettings}
            initialIntegrations={scheduleSmsIntegrations}
          />
        ) : section === "integrations" ? (
          <SettingsIntegrationsSection
            telephonyIntegration={telephonyIntegration}
            scheduleSmsIntegrations={scheduleSmsIntegrations}
            marketingIntegrations={marketingIntegrations}
            initialConnections={integrationConnections}
          />
        ) : section === "employees" ? (
          <div className="settings-card settings-card--placeholder">
            <p className="settings-placeholder-text">
              Раздел сотрудников уже доступен. Здесь управляются приглашения, роли, филиалы и
              карточки доступа персонала.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/dashboard/employees" className="btn-primary">
                Открыть раздел сотрудников
              </Link>
              <Link href="/dashboard/employees#invite" className="btn-secondary">
                Пригласить сотрудника
              </Link>
              <a
                href="http://127.0.0.1:8000/admin/accounts/employeeinvitation/"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                Админка
              </a>
            </div>
          </div>
        ) : (
          <div className="settings-card settings-card--placeholder">
            <p className="settings-placeholder-text">
              Раздел «{settingsSectionMeta[section].title}» появится на следующем этапе. Пока
              доступна настройка инструментов меню.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/dashboard/settings" className="btn-primary">
                Инструменты
              </Link>
              <a
                href="http://127.0.0.1:8000/admin/"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                Панель платформы
              </a>
            </div>
          </div>
        )}
      </SettingsLayout>
    </DashboardShell>
  );
}
