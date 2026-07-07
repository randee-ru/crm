import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingDeleteButton } from "@/components/bookings/booking-delete-button";
import { BookingForm } from "@/components/bookings/booking-form";
import { FitnessModulePage } from "@/components/fitness-module-page";
import { WidgetCard } from "@/components/widget-card";
import { getBooking, getBranches, getClients, getMemberships, getTrainers } from "@/lib/api";

type BookingDetailPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
};

const statusLabels: Record<string, string> = {
  draft: "Черновик",
  confirmed: "Подтверждено",
  completed: "Завершено",
  cancelled: "Отменено",
  no_show: "Не пришёл",
};

export async function generateMetadata({ params }: BookingDetailPageProps): Promise<Metadata> {
  const resolved = await params;
  const bookingId = Number(resolved.bookingId);
  if (!Number.isFinite(bookingId)) {
    return { title: "Бронирование" };
  }

  try {
    const booking = await getBooking(bookingId);
    return { title: `Бронирование: ${booking.title}` };
  } catch {
    return { title: "Бронирование" };
  }
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const resolved = await params;
  const bookingId = Number(resolved.bookingId);

  if (!Number.isFinite(bookingId)) {
    notFound();
  }

  const [booking, clients, trainers, memberships, branches] = await Promise.all([
    getBooking(bookingId).catch(() => null),
    getClients().catch(() => []),
    getTrainers().catch(() => []),
    getMemberships().catch(() => []),
    getBranches().catch(() => []),
  ]);

  if (!booking) {
    notFound();
  }

  return (
    <FitnessModulePage
      title="Карточка бронирования"
      description="Редактируйте запись, проверьте привязку к клиенту и тренеру или удалите ошибочную бронь."
      showCreate={false}
      sidebar={
        <>
          <WidgetCard title="Параметры" className="bg-white">
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Клиент</span>
                <span className="font-semibold text-[var(--text)]">{booking.client_name || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Тренер</span>
                <span className="font-semibold text-[var(--text)]">{booking.trainer_name || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Статус</span>
                <span className="font-semibold text-[var(--text)]">
                  {statusLabels[booking.status] ?? booking.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Абонемент</span>
                <span className="font-semibold text-[var(--text)]">{booking.membership_title || "—"}</span>
              </div>
            </div>
          </WidgetCard>

          <WidgetCard title="Действия" className="bg-white">
            <div className="flex flex-col gap-2">
              <Link href="/dashboard/bookings" className="bitrix-link text-[13px] font-medium">
                К списку
              </Link>
              <Link href="/dashboard/clients" className="bitrix-link text-[13px] font-medium">
                Открыть клиентов
              </Link>
              <BookingDeleteButton bookingId={booking.id} />
            </div>
          </WidgetCard>
        </>
      }
    >
      <div className="overflow-hidden bg-white">
        <div className="border-b border-[var(--line)] bg-[linear-gradient(180deg,#2b71bf_0%,#1f5e9e_100%)] px-5 py-5 text-white">
          <Link
            href="/dashboard/bookings"
            className="inline-flex items-center text-[12px] font-medium text-white/70 hover:text-white"
          >
            ← Назад к списку
          </Link>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Бронирование
              </p>
              <h1 className="mt-2 text-[28px] font-semibold">{booking.title}</h1>
              <p className="mt-2 text-[13px] text-white/75">
                {booking.client_name || "Без клиента"} · {statusLabels[booking.status] ?? booking.status}
              </p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white">
              {booking.branch_name || "Без филиала"}
            </span>
          </div>
        </div>

        <div className="bg-white p-5">
          <BookingForm
            booking={booking}
            clients={clients}
            trainers={trainers}
            memberships={memberships}
            branches={branches}
            submitLabel="Сохранить бронирование"
          />
        </div>
      </div>
    </FitnessModulePage>
  );
}
