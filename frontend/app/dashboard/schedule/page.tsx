import type { Metadata } from "next";

import { ScheduleWorkspace } from "@/components/schedule/schedule-workspace";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspaceCard } from "@/components/workspace-card";
import { getCompanyContext, getClients, getGroupPrograms, getGroupScheduleSlots, getScheduleSettings, getTrainers } from "@/lib/api";
import { addDays, formatLocalDate, getMonday } from "@/lib/schedule-week";
import type {
  ClientRecord,
  CompanyContext,
  GroupProgramRecord,
  GroupScheduleSlotRecord,
  ScheduleSettingsRecord,
  TrainerRecord,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Расписание",
};

const fallbackScheduleSettings: ScheduleSettingsRecord = {
  default_max_participants: 20,
  sms_reminder_hours: [24, 2],
  is_published: false,
  publish_weeks_ahead: 1,
  embed_token: "",
  updated_at: "",
};

export default async function SchedulePage() {
  const weekStart = getMonday(new Date());
  const weekEnd = addDays(weekStart, 6);
  let company: CompanyContext | null = null;
  let programs: GroupProgramRecord[] = [];
  let slots: GroupScheduleSlotRecord[] = [];
  let trainers: TrainerRecord[] = [];
  let clients: ClientRecord[] = [];
  let scheduleSettings: ScheduleSettingsRecord = fallbackScheduleSettings;
  let errorMessage = "";

  try {
    [company, programs, slots, trainers, clients, scheduleSettings] = await Promise.all([
      getCompanyContext(),
      getGroupPrograms(),
      getGroupScheduleSlots(undefined, formatLocalDate(weekStart), formatLocalDate(weekEnd)),
      getTrainers(),
      getClients(),
      getScheduleSettings(),
    ]);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Не удалось загрузить расписание. Проверьте, что backend запущен.";
  }

  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="schedule-workspace-card min-w-0 flex-1">
          {errorMessage || !company ? (
            <div className="p-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                <p className="text-[15px] font-semibold">Не удалось открыть расписание</p>
                <p className="mt-2 text-[13px] leading-6">
                  {errorMessage || "Не удалось загрузить данные расписания."}
                </p>
              </div>
            </div>
          ) : (
            <ScheduleWorkspace
              programs={programs}
              initialSlots={slots}
              trainers={trainers}
              clients={clients}
              companyName={company.name}
              companySlug={company.slug}
              scheduleSettings={scheduleSettings}
            />
          )}
        </WorkspaceCard>
      </div>
    </DashboardShell>
  );
}
