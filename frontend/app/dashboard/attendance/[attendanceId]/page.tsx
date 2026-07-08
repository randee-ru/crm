import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AttendanceDeleteButton } from "@/components/attendance/attendance-delete-button";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import { WidgetCard } from "@/components/widget-card";
import {
  getAttendanceRecord,
  getBookings,
  getBranches,
  getClients,
  getMemberships,
  getTrainers,
} from "@/lib/api";

type AttendanceDetailPageProps = {
  params: Promise<{
    attendanceId: string;
  }>;
};

const statusLabels: Record<string, string> = {
  checked_in: "Пришёл",
  late: "Опоздал",
  no_show: "Не пришёл",
  cancelled: "Отменено",
};

export async function generateMetadata({ params }: AttendanceDetailPageProps): Promise<Metadata> {
  const resolved = await params;
  const attendanceId = Number(resolved.attendanceId);
  if (!Number.isFinite(attendanceId)) {
    return { title: "Посещение" };
  }

  try {
    const attendance = await getAttendanceRecord(attendanceId);
    return { title: `Посещение: ${attendance.client_name}` };
  } catch {
    return { title: "Посещение" };
  }
}

export default async function AttendanceDetailPage({ params }: AttendanceDetailPageProps) {
  const resolved = await params;
  const attendanceId = Number(resolved.attendanceId);

  if (!Number.isFinite(attendanceId)) {
    notFound();
  }

  const [attendance, clients, trainers, memberships, bookings, branches] = await Promise.all([
    getAttendanceRecord(attendanceId).catch(() => null),
    getClients().catch(() => []),
    getTrainers().catch(() => []),
    getMemberships().catch(() => []),
    getBookings().catch(() => []),
    getBranches().catch(() => []),
  ]);

  if (!attendance) {
    notFound();
  }

  return (
      <div className="workspace-content min-h-0 flex-1">
        <div className="attendance-workspace-shell min-w-0 flex-1">
          <div className="attendance-workspace-main">
            <div className="attendance-detail-card">
              <Link
                href="/dashboard/attendance"
                className="inline-flex items-center text-[12px] font-medium text-[var(--link)] hover:underline"
              >
                ← Назад к списку
              </Link>
              <div className="attendance-detail-hero">
                <div>
                  <p className="attendance-detail-kicker">Посещение</p>
                  <h1 className="attendance-detail-title">{attendance.client_name}</h1>
                  <p className="attendance-detail-subtitle">
                    {statusLabels[attendance.status] ?? attendance.status} · {attendance.duration_label ?? "—"}
                  </p>
                </div>
                <span className="attendance-detail-badge">
                  {attendance.is_in_club ? "В клубе" : "Завершено"}
                </span>
              </div>
            </div>

            <div className="attendance-detail-editor">
              <AttendanceForm
                attendance={attendance}
                clients={clients}
                trainers={trainers}
                memberships={memberships}
                bookings={bookings}
                branches={branches}
                submitLabel="Сохранить посещение"
              />
            </div>
          </div>

          <aside className="attendance-workspace-sidebar">
            <WidgetCard title="Параметры" className="bg-white">
              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">Клиент</span>
                  <span className="font-semibold text-[var(--text)]">{attendance.client_name}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">Тренер</span>
                  <span className="font-semibold text-[var(--text)]">{attendance.trainer_name || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">Абонемент</span>
                  <span className="font-semibold text-[var(--text)]">{attendance.membership_title || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">Бронирование</span>
                  <span className="font-semibold text-[var(--text)]">{attendance.booking_title || "—"}</span>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard title="Действия" className="bg-white">
              <div className="flex flex-col gap-2">
                <Link href="/dashboard/attendance" className="bitrix-link text-[13px] font-medium">
                  К списку
                </Link>
                <AttendanceDeleteButton attendanceId={attendance.id} />
              </div>
            </WidgetCard>
          </aside>
        </div>
      </div>
  );
}
