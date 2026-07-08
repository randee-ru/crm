import type { Metadata } from "next";
import Link from "next/link";

import { AttendanceForm } from "@/components/attendance/attendance-form";
import { AttendanceOccupancyChart } from "@/components/attendance/attendance-occupancy-chart";
import {
  AttendanceToolbar,
  AttendanceVisitorsTable,
} from "@/components/attendance/attendance-visitors-panel";
import { WidgetCard } from "@/components/widget-card";
import {
  getAttendanceOccupancy,
  getAttendanceRecords,
  getBookings,
  getBranches,
  getClients,
  getCompanyContext,
  getMemberships,
  getTrainers,
} from "@/lib/api";
import type {
  AttendanceRecord,
  BookingRecord,
  BranchOption,
  ClientRecord,
  MembershipRecord,
  TrainerRecord,
} from "@/lib/types";

export const metadata: Metadata = { title: "Посещаемость" };

type AttendancePageProps = {
  searchParams: Promise<{
    when?: string;
    person?: string;
    date?: string;
  }>;
};

const emptyWhen = "now";
const emptyPerson = "clients";

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const params = await searchParams;
  const when = (params.when ?? emptyWhen) as "now" | "today" | "yesterday" | "date";
  const person = (params.person ?? emptyPerson) as "clients" | "staff" | "all";

  const [company, records, occupancy, clients, trainers, memberships, bookings, branches] = await Promise.all([
    getCompanyContext().catch(() => null),
    getAttendanceRecords(undefined, { when, person, date: params.date }).catch(() => [] as AttendanceRecord[]),
    getAttendanceOccupancy().catch(() => []),
    getClients().catch(() => [] as ClientRecord[]),
    getTrainers().catch(() => [] as TrainerRecord[]),
    getMemberships().catch(() => [] as MembershipRecord[]),
    getBookings().catch(() => [] as BookingRecord[]),
    getBranches().catch(() => [] as BranchOption[]),
  ]);

  const inClubCount =
    when === "now" ? records.length : records.filter((item) => item.is_in_club).length;

  return (
      <div className="workspace-content min-h-0 flex-1">
        <div className="attendance-workspace-shell min-w-0 flex-1">
          <div className="attendance-workspace-main">
            <AttendanceToolbar when={when} person={person} date={params.date} count={inClubCount} />
            <AttendanceVisitorsTable records={records} />
            <div className="attendance-chart-section">
              <h2 className="attendance-chart-title">График посещаемости за сегодня</h2>
              <AttendanceOccupancyChart points={occupancy} />
            </div>
          </div>

          <aside className="attendance-workspace-sidebar">
            <WidgetCard title="Сводка" className="bg-white">
              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">Компания</span>
                  <span className="font-semibold text-[var(--text)]">{company?.name ?? "Компания"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">В клубе</span>
                  <span className="font-semibold text-[var(--text)]">{inClubCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">Всего записей</span>
                  <span className="font-semibold text-[var(--text)]">{records.length}</span>
                </div>
              </div>
            </WidgetCard>

            <div id="create">
              <WidgetCard title="Создать посещение" className="bg-white">
                <AttendanceForm
                  clients={clients}
                  trainers={trainers}
                  memberships={memberships}
                  bookings={bookings}
                  branches={branches}
                />
              </WidgetCard>
            </div>

            <WidgetCard title="Быстрые переходы" className="bg-white">
              <div className="flex flex-col gap-2">
                <Link href="/dashboard/bookings" className="bitrix-link text-[13px] font-medium">
                  К бронированиям
                </Link>
                <Link href="/dashboard/memberships" className="bitrix-link text-[13px] font-medium">
                  К абонементам
                </Link>
              </div>
            </WidgetCard>
          </aside>
        </div>
      </div>
  );
}
