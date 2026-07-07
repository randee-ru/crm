import type { Metadata } from "next";
import Link from "next/link";

import { DashboardShell } from "@/components/dashboard-shell";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { SettingsPipelinesSection } from "@/components/settings/settings-pipelines-section";
import { SettingsScheduleSection } from "@/components/settings/settings-schedule-section";
import { SettingsToolsSection } from "@/components/settings/settings-tools-section";
import { getPipelines, getScheduleSettings, getScheduleSmsIntegrations } from "@/lib/api";
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

  if (section === "pipelines") {
    try {
      pipelines = await getPipelines();
    } catch {
      pipelines = [];
    }
  }

  if (section === "schedule") {
    try {
      [scheduleSettings, scheduleSmsIntegrations] = await Promise.all([
        getScheduleSettings(),
        getScheduleSmsIntegrations(),
      ]);
    } catch {
      scheduleSettings = {
        default_max_participants: 20,
        sms_reminder_hours: [24, 2],
        is_published: false,
        publish_weeks_ahead: 4,
        embed_token: "",
        updated_at: new Date().toISOString(),
      };
      scheduleSmsIntegrations = [];
    }
  }

  return (
    <DashboardShell>
      <SettingsLayout activeSection={section}>
        {section === "tools" ? (
          <SettingsToolsSection />
        ) : section === "pipelines" ? (
          <SettingsPipelinesSection initialPipelines={pipelines} />
        ) : section === "schedule" && scheduleSettings ? (
          <SettingsScheduleSection
            initialSettings={scheduleSettings}
            initialIntegrations={scheduleSmsIntegrations}
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
