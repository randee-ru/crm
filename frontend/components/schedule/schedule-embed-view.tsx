"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { ScheduleEmbedAuthPanel, logoutScheduleSession } from "@/components/schedule/schedule-embed-auth-panel";
import { ScheduleEmbedSlotModal } from "@/components/schedule/schedule-embed-slot-modal";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/app-icon";
import {
  cancelEnrollment,
  enrollOnSlot,
  fetchMyEnrollments,
  fetchPublicSchedule,
  getStoredSessionToken,
} from "@/lib/schedule-public-api";
import {
  addDays,
  formatDayDate,
  formatFullDate,
  formatLocalDate,
  formatWeekRange,
  getMonday,
  getWeekDays,
  isToday,
  parseLocalDate,
  weekdayIndex,
} from "@/lib/schedule-week";
import type { PublicClientEnrollmentRecord, PublicSchedulePayload, PublicScheduleSlotRecord } from "@/lib/types";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WEEKDAYS_FULL = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

type ScheduleEmbedViewProps = {
  companySlug: string;
  token: string;
};

function formatTime(value: string): string {
  return value.slice(0, 5);
}

function slotAvailabilityLabel(slot: PublicScheduleSlotRecord): string | null {
  if (slot.is_past) return "Завершено";
  if (slot.is_started) return "Идёт сейчас";
  if (!slot.can_book) return "Запись закрыта";
  return null;
}

function enrollmentStatusLabel(status: string): string {
  if (status === "waitlist") return "Лист ожидания";
  if (status === "confirmed") return "Вы записаны";
  return status;
}

function seatsLabel(seatsLeft: number): string {
  if (seatsLeft <= 0) return "Свободных мест: 0";
  return `Свободных мест: ${seatsLeft}`;
}

function isDayPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(date);
  compare.setHours(0, 0, 0, 0);
  return compare < today;
}

function dayNumberLabel(date: Date): string {
  return String(date.getDate());
}

export function ScheduleEmbedView({ companySlug, token }: ScheduleEmbedViewProps) {
  const [payload, setPayload] = useState<PublicSchedulePayload | null>(null);
  const [enrollments, setEnrollments] = useState<PublicClientEnrollmentRecord[]>([]);
  const [sessionToken, setSessionToken] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => formatLocalDate(new Date()));
  const [showBookings, setShowBookings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PublicScheduleSlotRecord | null>(null);
  const [isPending, startTransition] = useTransition();

  const reload = useCallback(
    async (nextSessionToken = sessionToken) => {
      const data = await fetchPublicSchedule(companySlug, token, nextSessionToken);
      setPayload(data);
      if (nextSessionToken) {
        const mine = await fetchMyEnrollments(companySlug, token, nextSessionToken);
        setEnrollments(mine);
      } else {
        setEnrollments([]);
      }
    },
    [companySlug, sessionToken, token],
  );

  useEffect(() => {
    const stored = getStoredSessionToken(companySlug);
    if (stored) setSessionToken(stored);
  }, [companySlug]);

  useEffect(() => {
    let active = true;
    void reload(sessionToken).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : "Не удалось загрузить расписание");
    });
    return () => {
      active = false;
    };
  }, [companySlug, token, sessionToken, reload]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const notifyHeight = () => {
      window.parent.postMessage(
        { type: "crmkit-schedule-height", height: document.documentElement.scrollHeight },
        "*",
      );
    };
    notifyHeight();
    const observer = new ResizeObserver(notifyHeight);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [payload, weekStart, selectedDay, enrollments, showBookings, showLogin, sessionToken, selectedSlot]);

  useEffect(() => {
    if (!selectedSlot) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedSlot(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedSlot]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, PublicScheduleSlotRecord[]>();
    for (const slot of payload?.slots ?? []) {
      const bucket = map.get(slot.session_date) ?? [];
      bucket.push(slot);
      map.set(slot.session_date, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [payload]);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const clientName = payload?.client?.name || "";
  const currentMonday = useMemo(() => getMonday(new Date()), []);
  const isCurrentWeek = formatLocalDate(weekStart) === formatLocalDate(currentMonday);

  useEffect(() => {
    const weekKeys = weekDays.map((date) => formatLocalDate(date));
    if (!weekKeys.includes(selectedDay)) {
      setSelectedDay(weekKeys[0]);
    }
  }, [weekDays, selectedDay]);

  const selectedDayDate = useMemo(() => parseLocalDate(selectedDay), [selectedDay]);
  const selectedDaySlots = slotsByDate.get(selectedDay) ?? [];
  const selectedDayPast = isDayPast(selectedDayDate);
  const selectedDayToday = isToday(selectedDayDate);

  const weekStats = useMemo(() => {
    let total = 0;
    let past = 0;
    for (const date of weekDays) {
      const daySlots = slotsByDate.get(formatLocalDate(date)) ?? [];
      total += daySlots.length;
      past += daySlots.filter((slot) => slot.is_past).length;
    }
    return { total, past, upcoming: total - past };
  }, [weekDays, slotsByDate]);

  const goToToday = () => {
    const monday = getMonday(new Date());
    setWeekStart(monday);
    setSelectedDay(formatLocalDate(new Date()));
  };

  const handleBook = (slot: PublicScheduleSlotRecord) => {
    if (slot.is_past || slot.is_started || !slot.can_book) return;
    if (!sessionToken) {
      setShowLogin(true);
      setActionError("Сначала войдите по номеру телефона и паролю.");
      return;
    }
    setActionError("");
    startTransition(async () => {
      try {
        await enrollOnSlot(companySlug, token, sessionToken, slot.id);
        await reload(sessionToken);
        setSelectedSlot(null);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Не удалось записаться");
      }
    });
  };

  const handleCancel = (enrollmentId: number) => {
    if (!sessionToken) return;
    setActionError("");
    startTransition(async () => {
      try {
        await cancelEnrollment(companySlug, token, sessionToken, enrollmentId);
        await reload(sessionToken);
        setSelectedSlot(null);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Не удалось отменить запись");
      }
    });
  };

  const canCancelEnrollment = (sessionDate: string, startTime: string): boolean => {
    // Клиентская проверка для UI (финальная проверка всё равно на backend).
    // Дата/время приходят как локальные строки, без timezone-суффиксов.
    const start = new Date(`${sessionDate}T${startTime}`);
    if (Number.isNaN(start.getTime())) return false;
    return Date.now() < start.getTime() - 60 * 60 * 1000;
  };

  if (error) {
    return (
      <div className="schedule-embed schedule-embed--error">
        <p>{error}</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="schedule-embed schedule-embed--loading">
        <div className="schedule-embed-spinner" aria-hidden="true" />
        <p>Загрузка расписания…</p>
      </div>
    );
  }

  return (
    <div className="schedule-embed">
      <header className="schedule-embed-hero">
        <div className="schedule-embed-hero-main">
          <div className="schedule-embed-hero-brand">
            <span className="schedule-embed-badge">Расписание</span>
            <h1>{payload.company_name}</h1>
          </div>

          <div className="schedule-embed-weekbar">
            <button type="button" className="schedule-embed-weeknav" aria-label="Предыдущая неделя" onClick={() => setWeekStart((c) => addDays(c, -7))}>
              <IconChevronLeft size={18} />
            </button>
            <div className="schedule-embed-weeklabel">
              <strong>{formatWeekRange(weekStart)}</strong>
              {!isCurrentWeek ? (
                <button type="button" className="schedule-embed-today" onClick={goToToday}>
                  Сегодня
                </button>
              ) : null}
            </div>
            <button type="button" className="schedule-embed-weeknav" aria-label="Следующая неделя" onClick={() => setWeekStart((c) => addDays(c, 7))}>
              <IconChevronRight size={18} />
            </button>
          </div>

          <div className="schedule-embed-hero-actions">
            {sessionToken ? (
              <button type="button" className="schedule-embed-login-chip" onClick={() => setShowBookings((v) => !v)}>
                Мои записи · {enrollments.length}
              </button>
            ) : null}
            {payload.booking_enabled ? (
              <button
                type="button"
                className={`schedule-embed-login-chip${clientName ? " schedule-embed-login-chip--active" : ""}`}
                onClick={() => setShowLogin((value) => !value)}
              >
                {clientName || "Войти"}
              </button>
            ) : null}
          </div>
        </div>
        <p className="schedule-embed-hero-sub">
          {weekStats.upcoming} предстоящих · {weekStats.past} прошедших · неделя целиком
        </p>
      </header>

      <div className="schedule-embed-mobile-weekbar" aria-label="Переход по неделям">
        <button
          type="button"
          className="schedule-embed-mobile-weeknav"
          aria-label="Предыдущая неделя"
          onClick={() => setWeekStart((current) => addDays(current, -7))}
        >
          <IconChevronLeft size={18} />
        </button>
        <div className="schedule-embed-mobile-weeklabel">
          <strong>{formatWeekRange(weekStart)}</strong>
          <span>{weekStats.upcoming} занятий на неделе</span>
        </div>
        {!isCurrentWeek ? (
          <button type="button" className="schedule-embed-mobile-today" onClick={goToToday}>
            Сегодня
          </button>
        ) : null}
        <button
          type="button"
          className="schedule-embed-mobile-weeknav"
          aria-label="Следующая неделя"
          onClick={() => setWeekStart((current) => addDays(current, 7))}
        >
          <IconChevronRight size={18} />
        </button>
      </div>

      {payload.booking_enabled && showLogin ? (
        <div className="schedule-embed-auth-overlay" onClick={() => setShowLogin(false)}>
          <div className="schedule-embed-auth-modal" onClick={(event) => event.stopPropagation()}>
            <ScheduleEmbedAuthPanel
              companySlug={companySlug}
              embedToken={token}
              clientName={clientName}
              onAuthenticated={(nextToken) => {
                setSessionToken(nextToken);
                setActionError("");
                setShowLogin(false);
              }}
              onLogout={() => {
                logoutScheduleSession(companySlug, () => {
                  setSessionToken("");
                  setEnrollments([]);
                  setShowLogin(false);
                });
              }}
            />
          </div>
        </div>
      ) : null}

      {sessionToken && showBookings ? (
        <section className="schedule-embed-bookings schedule-embed-bookings--bar">
          <div className="schedule-embed-bookings-list">
            {enrollments.length === 0 ? (
              <p className="schedule-embed-day-empty">У вас пока нет записей</p>
            ) : (
              enrollments.map((item) => (
                <article key={item.id} className="schedule-embed-booking-card">
                  <div>
                    <strong>{item.display_title}</strong>
                    <span>
                      {formatDayDate(parseLocalDate(item.session_date))} · {formatTime(item.start_time)}
                    </span>
                    <em>{enrollmentStatusLabel(item.status)}</em>
                  </div>
                  <button
                    type="button"
                    disabled={isPending || !canCancelEnrollment(item.session_date, item.start_time)}
                    onClick={() => handleCancel(item.id)}
                  >
                    Отменить
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {actionError ? <p className="schedule-embed-action-error">{actionError}</p> : null}

      {selectedSlot ? (
        <ScheduleEmbedSlotModal
          slot={payload.slots.find((item) => item.id === selectedSlot.id) ?? selectedSlot}
          sessionToken={Boolean(sessionToken)}
          isPending={isPending}
          onClose={() => setSelectedSlot(null)}
          onBook={handleBook}
          onCancel={handleCancel}
        />
      ) : null}

      <nav className="schedule-embed-day-picker" aria-label="Выбор дня">
        {weekDays.map((date) => {
          const key = formatLocalDate(date);
          const weekday = weekdayIndex(date);
          const today = isToday(date);
          const count = slotsByDate.get(key)?.length ?? 0;
          const active = key === selectedDay;
          return (
            <button
              key={key}
              type="button"
              className={`schedule-embed-day-chip${active ? " schedule-embed-day-chip--active" : ""}${today ? " schedule-embed-day-chip--today" : ""}`}
              aria-label={`${WEEKDAYS_FULL[weekday]} ${dayNumberLabel(date)}${today ? ", сегодня" : ""}, занятий: ${count}`}
              aria-pressed={active}
              onClick={() => setSelectedDay(key)}
            >
              <span className="schedule-embed-day-chip-weekday">{WEEKDAYS[weekday]}</span>
              <strong>{dayNumberLabel(date)}</strong>
              <em>{count > 0 ? count : "—"}</em>
              {today ? <span className="schedule-embed-day-chip-dot" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </nav>

      <section
        className={`schedule-embed-mobile-day${selectedDayToday ? " schedule-embed-mobile-day--today" : ""}${selectedDayPast ? " schedule-embed-mobile-day--past" : ""}`}
      >
        <header className="schedule-embed-mobile-day-head">
          <div>
            <strong>
              {formatDayDate(selectedDayDate)}
              {selectedDayToday ? <span className="schedule-embed-mobile-today-badge">Сегодня</span> : null}
            </strong>
            <span>{WEEKDAYS_FULL[weekdayIndex(selectedDayDate)]}</span>
          </div>
          <span className="schedule-embed-day-count" title="Занятий в этот день">
            {selectedDaySlots.length}
          </span>
        </header>

        {selectedDaySlots.length === 0 ? (
          <p className="schedule-embed-day-empty">Занятий нет</p>
        ) : (
          <div className="schedule-embed-mobile-list">
            {selectedDaySlots.map((slot) => (
              <article
                key={slot.id}
                className={`schedule-embed-mobile-card${slot.is_past ? " schedule-embed-mobile-card--past" : ""}${slot.is_enrolled ? " schedule-embed-mobile-card--enrolled" : ""}`}
              >
                <div className="schedule-embed-mobile-card-accent" style={{ backgroundColor: slot.display_color }} />
                <div className="schedule-embed-mobile-card-body">
                  <div className="schedule-embed-mobile-card-top">
                    <span className="schedule-embed-mobile-card-time">
                      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                    </span>
                    {slot.is_past ? (
                      <span className="schedule-embed-chip schedule-embed-chip--past">Завершено</span>
                    ) : slot.is_enrolled ? (
                      <span className="schedule-embed-chip schedule-embed-chip--enrolled">
                        {enrollmentStatusLabel(slot.enrollment_status || "confirmed")}
                      </span>
                    ) : slot.is_started ? (
                      <span className="schedule-embed-chip schedule-embed-chip--live">Идёт сейчас</span>
                    ) : !slot.can_book ? (
                      <span className="schedule-embed-chip schedule-embed-chip--closed">Запись закрыта</span>
                    ) : null}
                  </div>
                  <strong className="schedule-embed-mobile-card-title">{slot.display_title}</strong>
                  {!slot.is_past ? (
                    <p className="schedule-embed-mobile-card-seats">
                      {slot.is_enrolled
                        ? enrollmentStatusLabel(slot.enrollment_status || "confirmed")
                        : seatsLabel(slot.seats_left)}
                    </p>
                  ) : null}
                  <div className="schedule-embed-mobile-card-actions">
                    <button type="button" className="schedule-embed-mobile-more" onClick={() => setSelectedSlot(slot)}>
                      Подробнее
                    </button>
                    {!slot.is_past && !slot.is_enrolled && slot.can_book ? (
                      <button
                        type="button"
                        className="schedule-embed-slot-book schedule-embed-mobile-book"
                        disabled={isPending}
                        onClick={() => handleBook(slot)}
                      >
                        {sessionToken ? "Записаться" : "Войти"}
                      </button>
                    ) : null}
                    {!slot.is_past && slot.is_enrolled && slot.enrollment_id ? (
                      <button
                        type="button"
                        className="schedule-embed-slot-cancel schedule-embed-mobile-book"
                        disabled={isPending || !slot.can_cancel}
                        onClick={() => handleCancel(slot.enrollment_id as number)}
                      >
                        Отменить
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="schedule-embed-week-grid">
        {weekDays.map((date) => {
          const sessionDate = formatLocalDate(date);
          const daySlots = slotsByDate.get(sessionDate) ?? [];
          const weekday = weekdayIndex(date);
          const today = isToday(date);
          const pastDay = isDayPast(date);
          return (
            <section
              key={sessionDate}
              className={`schedule-embed-day${today ? " schedule-embed-day--today" : ""}${pastDay ? " schedule-embed-day--past" : ""}`}
            >
              <header className="schedule-embed-day-head">
                <div className="schedule-embed-day-date">
                  <span className="schedule-embed-day-weekday">{WEEKDAYS[weekday]}</span>
                  <strong>{formatDayDate(date)}</strong>
                  <span className="schedule-embed-day-fullname">{WEEKDAYS_FULL[weekday]}</span>
                </div>
                <div className="schedule-embed-day-badges">
                  {today ? <em className="schedule-embed-chip schedule-embed-chip--today">Сегодня</em> : null}
                  {pastDay && !today ? <em className="schedule-embed-chip schedule-embed-chip--past">Прошло</em> : null}
                  <span className="schedule-embed-day-count">{daySlots.length}</span>
                </div>
              </header>

              {daySlots.length === 0 ? (
                <p className="schedule-embed-day-empty">Занятий нет</p>
              ) : (
                <div className="schedule-embed-slot-list">
                  {daySlots.map((slot) => (
                    <article
                      key={slot.id}
                      className={`schedule-embed-slot${slot.is_past ? " schedule-embed-slot--past" : ""}${slot.is_enrolled ? " schedule-embed-slot--enrolled" : ""}`}
                    >
                      <div className="schedule-embed-slot-accent" style={{ backgroundColor: slot.display_color }} />
                      <div className="schedule-embed-slot-body">
                        <div className="schedule-embed-slot-top">
                          <div className="schedule-embed-slot-time">
                            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                          </div>
                          {slot.is_past ? (
                            <span className="schedule-embed-chip schedule-embed-chip--past">Завершено</span>
                          ) : slot.is_enrolled ? (
                            <span className="schedule-embed-chip schedule-embed-chip--enrolled">
                              {enrollmentStatusLabel(slot.enrollment_status || "confirmed")}
                            </span>
                          ) : slotAvailabilityLabel(slot) ? (
                            <span
                              className={`schedule-embed-chip${slot.is_started ? " schedule-embed-chip--live" : " schedule-embed-chip--closed"}`}
                            >
                              {slotAvailabilityLabel(slot)}
                            </span>
                          ) : null}
                        </div>
                        <strong className="schedule-embed-slot-title">{slot.display_title}</strong>
                        {!slot.is_past ? (
                          <p className="schedule-embed-slot-seats">
                            {slot.is_enrolled
                              ? enrollmentStatusLabel(slot.enrollment_status || "confirmed")
                              : seatsLabel(slot.seats_left)}
                          </p>
                        ) : null}
                        <div className="schedule-embed-slot-actions">
                          <button
                            type="button"
                            className="schedule-embed-slot-more"
                            onClick={() => setSelectedSlot(slot)}
                          >
                            Подробнее
                          </button>
                          {!slot.is_past && slot.can_book && !slot.is_enrolled ? (
                            <button
                              type="button"
                              className="schedule-embed-slot-book"
                              disabled={isPending}
                              onClick={() => handleBook(slot)}
                            >
                              {sessionToken ? "Записаться" : "Войти"}
                            </button>
                          ) : null}
                          {!slot.is_past && slot.is_enrolled && slot.enrollment_id ? (
                            <button
                              type="button"
                              className="schedule-embed-slot-cancel schedule-embed-slot-cancel--compact"
                              disabled={isPending || !slot.can_cancel}
                              onClick={() => handleCancel(slot.enrollment_id as number)}
                            >
                              Отменить
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <footer className="schedule-embed-footer">
        <span>
          Период: {formatFullDate(parseLocalDate(payload.date_from))} — {formatDayDate(parseLocalDate(payload.date_to))}
        </span>
        <span>Обновляется автоматически</span>
      </footer>
    </div>
  );
}
