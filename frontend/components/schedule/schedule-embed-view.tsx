"use client";

import { useEffect, useMemo, useState } from "react";

import { IconChevronLeft, IconChevronRight } from "@/components/ui/app-icon";
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
import type { PublicSchedulePayload, PublicScheduleSlotRecord } from "@/lib/types";

const WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

type ScheduleEmbedViewProps = {
  companySlug: string;
  token: string;
};

async function fetchPublicSchedule(companySlug: string, token: string): Promise<PublicSchedulePayload> {
  const params = new URLSearchParams({ token });
  const response = await fetch(`/backend/api/v1/public/schedule/${companySlug}/?${params.toString()}`);
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(payload.detail || `Ошибка ${response.status}`);
  }
  return response.json() as Promise<PublicSchedulePayload>;
}

function formatTime(value: string): string {
  return value.slice(0, 5);
}

export function ScheduleEmbedView({ companySlug, token }: ScheduleEmbedViewProps) {
  const [payload, setPayload] = useState<PublicSchedulePayload | null>(null);
  const [error, setError] = useState("");
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  useEffect(() => {
    let active = true;
    void fetchPublicSchedule(companySlug, token)
      .then((data) => {
        if (active) setPayload(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Не удалось загрузить расписание");
      });
    return () => {
      active = false;
    };
  }, [companySlug, token]);

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
  }, [payload, weekStart]);

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
        <p>Загрузка расписания…</p>
      </div>
    );
  }

  return (
    <div className="schedule-embed">
      <header className="schedule-embed-header">
        <div>
          <span className="schedule-embed-badge">Расписание</span>
          <h1>{payload.company_name}</h1>
        </div>
        <div className="schedule-embed-nav">
          <button type="button" aria-label="Предыдущая неделя" onClick={() => setWeekStart((current) => addDays(current, -7))}>
            <IconChevronLeft size={18} />
          </button>
          <strong>{formatWeekRange(weekStart)}</strong>
          <button type="button" aria-label="Следующая неделя" onClick={() => setWeekStart((current) => addDays(current, 7))}>
            <IconChevronRight size={18} />
          </button>
        </div>
      </header>

      <div className="schedule-embed-days">
        {weekDays.map((date) => {
          const sessionDate = formatLocalDate(date);
          const daySlots = slotsByDate.get(sessionDate) ?? [];
          const weekday = weekdayIndex(date);
          const today = isToday(date);
          return (
            <section
              key={sessionDate}
              className={`schedule-embed-day${today ? " schedule-embed-day--today" : ""}${daySlots.length === 0 ? " schedule-embed-day--empty" : ""}`}
            >
              <header className="schedule-embed-day-head">
                <div>
                  <strong>{formatDayDate(date)}</strong>
                  <span>{WEEKDAYS[weekday]}</span>
                </div>
                {today ? <em>сегодня</em> : null}
              </header>

              {daySlots.length === 0 ? (
                <p className="schedule-embed-day-empty">Занятий нет</p>
              ) : (
                <div className="schedule-embed-slot-list">
                  {daySlots.map((slot) => (
                    <article
                      key={slot.id}
                      className="schedule-embed-slot"
                      style={{
                        borderColor: slot.display_color,
                        background: `linear-gradient(135deg, ${slot.display_color}14 0%, #ffffff 70%)`,
                      }}
                    >
                      <div className="schedule-embed-slot-time">
                        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                      </div>
                      <div className="schedule-embed-slot-main">
                        <strong>{slot.display_title}</strong>
                        {slot.program_code ? <span className="schedule-embed-slot-code">{slot.program_code}</span> : null}
                      </div>
                      {slot.trainer_display ? <p className="schedule-embed-slot-meta">{slot.trainer_display}</p> : null}
                      {slot.room ? <p className="schedule-embed-slot-meta">{slot.room}</p> : null}
                      {slot.description ? <p className="schedule-embed-slot-desc">{slot.description}</p> : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <footer className="schedule-embed-footer">
        <span>Расписание {payload.company_name}</span>
        <span>
          {formatFullDate(parseLocalDate(payload.date_from))} — {formatDayDate(parseLocalDate(payload.date_to))}
        </span>
      </footer>
    </div>
  );
}
