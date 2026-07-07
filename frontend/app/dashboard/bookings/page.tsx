import type { Metadata } from "next";
import Link from "next/link";

import { BookingForm } from "@/components/bookings/booking-form";
import { FitnessModulePage } from "@/components/fitness-module-page";
import { WidgetCard } from "@/components/widget-card";
import {
  bookingStatusLabels,
  formatDateTime,
  formatTime,
  getBookings,
  getBranches,
  getClients,
  getCompanyContext,
  getMemberships,
  getTrainers,
} from "@/lib/api";
import type { BookingRecord, BranchOption, ClientRecord, MembershipRecord, TrainerRecord } from "@/lib/types";

export const metadata: Metadata = { title: "Бронирования" };

type BookingsPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
};

const statusOptions = [
  { value: "", label: "Все статусы" },
  { value: "draft", label: "Черновик" },
  { value: "confirmed", label: "Подтверждено" },
  { value: "completed", label: "Завершено" },
  { value: "cancelled", label: "Отменено" },
  { value: "no_show", label: "Не пришёл" },
] as const;

const statusPills: Record<string, string> = {
  draft: "bg-[#eff6ff] text-[#1d4ed8]",
  confirmed: "bg-[#ecfdf5] text-[#047857]",
  completed: "bg-[#e8f4ff] text-[#2b7fd6]",
  cancelled: "bg-[#f3f4f6] text-[#6b7280]",
  no_show: "bg-[#ffe9e8] text-[#b42318]",
};

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const status = params.status?.trim() ?? "";

  const [company, bookings, clients, trainers, memberships, branches] = await Promise.all([
    getCompanyContext().catch(() => null),
    getBookings(undefined).catch(() => [] as BookingRecord[]),
    getClients().catch(() => [] as ClientRecord[]),
    getTrainers().catch(() => [] as TrainerRecord[]),
    getMemberships().catch(() => [] as MembershipRecord[]),
    getBranches().catch(() => [] as BranchOption[]),
  ]);

  const filteredBookings = bookings.filter((item) => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.trainer_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !status || item.status === status;
    return matchesSearch && matchesStatus;
  });

  const confirmedCount = filteredBookings.filter((item) => item.status === "confirmed").length;

  return (
    <FitnessModulePage
      title="Бронирования"
      description="Записи на тренировки, визиты и услуги. Экран связывает клиента, абонемент и тренера в одном месте."
      showCreate={false}
      sidebar={
        <>
          <WidgetCard title="Сводка" className="bg-white">
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Компания</span>
                <span className="font-semibold text-[var(--text)]">{company?.name ?? "Компания"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Всего</span>
                <span className="font-semibold text-[var(--text)]">{filteredBookings.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Подтверждено</span>
                <span className="font-semibold text-[var(--text)]">{confirmedCount}</span>
              </div>
            </div>
          </WidgetCard>

          <WidgetCard title="Создать бронирование" className="bg-white">
            <BookingForm
              clients={clients}
              trainers={trainers}
              memberships={memberships}
              branches={branches}
            />
          </WidgetCard>
        </>
      }
    >
      <div className="border-b border-[var(--line)] bg-[linear-gradient(180deg,#2b71bf_0%,#1f5e9e_100%)] px-5 py-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60">
              Бронирования
            </p>
            <h1 className="mt-2 text-[30px] font-semibold leading-none">Журнал бронирований</h1>
            <p className="mt-3 max-w-3xl text-[13px] leading-6 text-white/75">
              Здесь видны записи клиентов, тренеров и абонементов. Справа можно создавать новые записи без лишних переходов.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="#create"
              className="inline-flex items-center gap-2 rounded-full bg-[#27c56c] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#1fb15f]"
            >
              + Новая запись
            </Link>
            <Link
              href="/dashboard/clients"
              className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-white/15"
            >
              Клиенты
            </Link>
          </div>
        </div>

        <form method="get" className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex min-w-[280px] flex-1 items-center rounded-full border border-white/15 bg-white/10 px-4 py-2.5 shadow-inner shadow-black/5 backdrop-blur">
            <input
              name="search"
              defaultValue={search}
              placeholder="Поиск по бронированию, клиенту или тренеру"
              className="w-full border-0 bg-transparent text-[14px] text-white placeholder:text-white/60 focus:outline-none"
            />
          </div>
          <select
            name="status"
            defaultValue={status}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-[13px] text-white outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1f5e9e] transition hover:bg-white/90"
          >
            Найти
          </button>
          {search || status ? (
            <Link
              href="/dashboard/bookings"
              className="rounded-full border border-white/20 px-4 py-2.5 text-[13px] font-medium text-white/85 hover:bg-white/10"
            >
              Сбросить
            </Link>
          ) : null}
          <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-[13px] text-white/85">
            В компании
          </span>
        </form>
      </div>

      <div className="border-b border-[var(--line)] bg-[var(--panel-muted)] px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <p className="text-[12px] text-[var(--muted)]">Всего</p>
            <p className="mt-1 text-[24px] font-semibold text-[var(--text)]">{filteredBookings.length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <p className="text-[12px] text-[var(--muted)]">Подтверждено</p>
            <p className="mt-1 text-[24px] font-semibold text-[var(--text)]">{confirmedCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <p className="text-[12px] text-[var(--muted)]">Клиентов</p>
            <p className="mt-1 text-[24px] font-semibold text-[var(--text)]">{clients.length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <p className="text-[12px] text-[var(--muted)]">Тренеров</p>
            <p className="mt-1 text-[24px] font-semibold text-[var(--text)]">{trainers.length}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white">
        <table className="min-w-full text-left text-[13px]">
          <thead className="border-b border-[var(--line)] bg-[var(--panel-muted)] text-[12px] uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Бронь</th>
              <th className="px-4 py-3 font-medium">Время</th>
              <th className="px-4 py-3 font-medium">Клиент</th>
              <th className="px-4 py-3 font-medium">Тренер</th>
              <th className="px-4 py-3 font-medium">Абонемент</th>
              <th className="px-4 py-3 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-[#f8fbfe]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
                      className="font-semibold text-[var(--text)] hover:text-[var(--accent-strong)]"
                    >
                      {booking.title}
                    </Link>
                    <div className="text-[12px] text-[var(--muted)]">{booking.source || "Без источника"}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    <div>
                      {formatTime(booking.starts_at)} - {formatTime(booking.ends_at)}
                    </div>
                    <div className="text-[12px]">{formatDateTime(booking.starts_at)}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{booking.client_name || "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{booking.trainer_name || "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{booking.membership_title || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusPills[booking.status] ?? statusPills.draft}`}
                    >
                      {bookingStatusLabels[booking.status] ?? booking.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-[13px] text-[var(--muted)]" colSpan={6}>
                  Бронирований пока нет. Создайте первую запись справа в форме.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </FitnessModulePage>
  );
}
