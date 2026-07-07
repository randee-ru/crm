"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  createGroupScheduleSlotAction,
  createSlotEnrollmentAction,
  deleteGroupScheduleSlotAction,
  deleteSlotEnrollmentAction,
  listGroupScheduleSlotsAction,
  listSlotEnrollmentsAction,
  updateGroupScheduleSlotAction,
} from "@/app/actions/schedule";
import { IconClose, IconGlobe, IconGrip, IconPencil, IconPrinter, IconSettings, IconShare } from "@/components/ui/app-icon";
import { SchedulePublishModal } from "@/components/schedule/schedule-publish-modal";
import { ScheduleSocialModal } from "@/components/schedule/schedule-social-modal";
import { ScheduleWeekSwiper } from "@/components/schedule/schedule-week-swiper";
import { buildScheduleExportData, printScheduleA4 } from "@/lib/schedule-export";
import {
  addDays,
  formatDayDate,
  formatFullDate,
  formatLocalDate,
  getMonday,
  isToday,
  parseLocalDate,
  weekdayIndex,
} from "@/lib/schedule-week";
import type {
  ClientRecord,
  GroupProgramRecord,
  GroupScheduleSlotRecord,
  GroupSlotEnrollmentRecord,
  ScheduleSettingsRecord,
  TrainerRecord,
} from "@/lib/types";

const WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 24;
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, index) => DAY_START_HOUR + index);
const DAY_START_MINUTES = 7 * 60;
const DAY_END_MINUTES = DAY_END_HOUR * 60;
const MAX_SLOT_END_MINUTES = DAY_END_MINUTES - 1;
const HOUR_HEIGHT = 52;
const DRAG_PROGRAM = "application/x-crm-program-id";
const DRAG_SLOT = "application/x-crm-slot-id";

type ScheduleWorkspaceProps = {
  programs: GroupProgramRecord[];
  initialSlots: GroupScheduleSlotRecord[];
  trainers: TrainerRecord[];
  clients: ClientRecord[];
  companyName: string;
  companySlug: string;
  scheduleSettings: ScheduleSettingsRecord;
};

type EditState = {
  slot: GroupScheduleSlotRecord;
  program: GroupProgramRecord;
  slotDate: Date | null;
};

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad(h)}:${pad(m)}`;
}

function slotPosition(startTime: string, endTime: string) {
  const start = Math.max(timeToMinutes(startTime), DAY_START_MINUTES);
  const end = Math.min(timeToMinutes(endTime), DAY_END_MINUTES);
  const span = DAY_END_MINUTES - DAY_START_MINUTES;
  const top = ((start - DAY_START_MINUTES) / span) * 100;
  const height = Math.max(((end - start) / span) * 100, 6);
  return { top: `${top}%`, height: `${height}%` };
}

function snapMinutesFromPointer(offsetY: number): number {
  const raw = DAY_START_MINUTES + (offsetY / HOUR_HEIGHT) * 60;
  const snapped = Math.round(raw / 30) * 30;
  return Math.max(DAY_START_MINUTES, Math.min(snapped, DAY_END_MINUTES - 30));
}

function clampSlotEnd(startMinutes: number, durationMinutes: number): number {
  return Math.max(startMinutes + 1, Math.min(startMinutes + durationMinutes, MAX_SLOT_END_MINUTES));
}

function slotTitle(slot: GroupScheduleSlotRecord): string {
  return slot.display_title || slot.custom_title || slot.program_title;
}

function slotColor(slot: GroupScheduleSlotRecord, program?: GroupProgramRecord): string {
  return slot.color || slot.display_color || program?.color || slot.program_color || "#2f6fed";
}

const SLOT_COLOR_PRESETS = [
  "#e53935",
  "#f4511e",
  "#ff7043",
  "#ffb300",
  "#43a047",
  "#00897b",
  "#00acc1",
  "#1e88e5",
  "#3949ab",
  "#5e35b1",
  "#8e24aa",
  "#d81b60",
  "#6d4c41",
  "#546e7a",
] as const;

export function ScheduleWorkspace({
  programs,
  initialSlots,
  trainers,
  clients,
  companyName,
  companySlug,
  scheduleSettings,
}: ScheduleWorkspaceProps) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [slots, setSlots] = useState(initialSlots);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [publishSettings, setPublishSettings] = useState(scheduleSettings);
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const skipInitialWeekFetch = useRef(true);

  const programsById = useMemo(() => new Map(programs.map((item) => [item.id, item])), [programs]);

  useEffect(() => {
    const from = formatLocalDate(weekStart);
    const to = formatLocalDate(addDays(weekStart, 6));
    if (skipInitialWeekFetch.current) {
      skipInitialWeekFetch.current = false;
      return;
    }
    let active = true;
    setLoadingWeek(true);
    void listGroupScheduleSlotsAction(from, to)
      .then((items) => {
        if (active) setSlots(items);
      })
      .catch(() => {
        if (active) setMessage("Не удалось загрузить занятия за выбранную неделю");
      })
      .finally(() => {
        if (active) setLoadingWeek(false);
      });
    return () => {
      active = false;
    };
  }, [weekStart]);

  useEffect(() => {
    if (!isDragging) return;
    const handleDragEnd = () => setIsDragging(false);
    window.addEventListener("dragend", handleDragEnd);
    return () => window.removeEventListener("dragend", handleDragEnd);
  }, [isDragging]);

  const filteredPrograms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return programs;
    return programs.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.code.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized),
    );
  }, [programs, query]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, GroupScheduleSlotRecord[]>();
    for (const slot of slots) {
      const bucket = map.get(slot.session_date) ?? [];
      bucket.push(slot);
      map.set(slot.session_date, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [slots]);

  function beginDrag() {
    setIsDragging(true);
  }

  async function createSlot(programId: number, sessionDate: string, startMinutes: number) {
    const start_time = minutesToTime(startMinutes);
    const end_time = minutesToTime(clampSlotEnd(startMinutes, 60));
    setBusy(true);
    setMessage("");
    try {
      const created = await createGroupScheduleSlotAction({
        program: programId,
        session_date: sessionDate,
        start_time,
        end_time,
      });
      setSlots((prev) => [...prev, created]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось добавить занятие");
    } finally {
      setBusy(false);
    }
  }

  async function moveSlot(slotId: number, sessionDate: string, startMinutes: number) {
    const slot = slots.find((item) => item.id === slotId);
    if (!slot) return;
    const duration = Math.max(30, timeToMinutes(slot.end_time) - timeToMinutes(slot.start_time));
    const start_time = minutesToTime(startMinutes);
    const end_time = minutesToTime(clampSlotEnd(startMinutes, duration));
    setBusy(true);
    setMessage("");
    try {
      const updated = await updateGroupScheduleSlotAction(slotId, { session_date: sessionDate, start_time, end_time });
      setSlots((prev) => {
        const next = prev.map((item) => (item.id === updated.id ? updated : item));
        return next.filter((item) => item.session_date >= formatLocalDate(weekStart) && item.session_date <= formatLocalDate(addDays(weekStart, 6)));
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось переместить занятие");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(payload: {
    program: number;
    custom_title: string;
    max_participants: number | null;
    room: string;
    trainer_name: string;
    trainer: number | null;
    description: string;
    restrictions: string;
    start_time: string;
    end_time: string;
    session_date: string;
    color: string;
  }) {
    if (!edit) return;
    setBusy(true);
    setMessage("");
    try {
      const updated = await updateGroupScheduleSlotAction(edit.slot.id, payload);
      setSlots((prev) => {
        const next = prev.map((item) => (item.id === updated.id ? updated : item));
        return next.filter((item) => item.session_date >= formatLocalDate(weekStart) && item.session_date <= formatLocalDate(addDays(weekStart, 6)));
      });
      const program = programsById.get(updated.program);
      if (program) {
        setEdit({ slot: updated, program, slotDate: edit.slotDate });
      } else {
        setEdit(null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  async function removeSlot(slotId: number) {
    setBusy(true);
    setMessage("");
    try {
      await deleteGroupScheduleSlotAction(slotId);
      setSlots((prev) => prev.filter((item) => item.id !== slotId));
      setEdit(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось удалить");
    } finally {
      setBusy(false);
    }
  }

  function handleDayDrop(sessionDate: string, event: React.DragEvent) {
    event.preventDefault();
    setDragOverDate(null);
    setIsDragging(false);
    const body = dayRefs.current[sessionDate];
    if (!body) return;
    const rect = body.getBoundingClientRect();
    const startMinutes = snapMinutesFromPointer(event.clientY - rect.top);
    const programId = Number(event.dataTransfer.getData(DRAG_PROGRAM));
    const slotId = Number(event.dataTransfer.getData(DRAG_SLOT));
    if (slotId) {
      void moveSlot(slotId, sessionDate, startMinutes);
      return;
    }
    if (programId) {
      void createSlot(programId, sessionDate, startMinutes);
    }
  }

  function openEdit(slot: GroupScheduleSlotRecord, slotDate: Date | null = null) {
    const program = programsById.get(slot.program);
    if (program) {
      setEdit({ slot, program, slotDate });
    }
  }

  function handlePrint() {
    try {
      const exportData = buildScheduleExportData(companyName, weekStart, slots);
      printScheduleA4(exportData);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось открыть печать");
    }
  }

  const boardHeight = HOURS.length * HOUR_HEIGHT;

  return (
    <div className={`schedule-workspace${isDragging ? " schedule-workspace--dragging" : ""}`}>
      <header className="schedule-hero">
        <div className="schedule-hero-copy">
          <span className="schedule-hero-badge">Групповые программы</span>
          <h1>Расписание</h1>
          <p>
            {companyName} · каждое занятие привязано к конкретной дате. Перетащите программу на нужный день и время.
          </p>
        </div>
        <div className="schedule-hero-actions">
          <div className="schedule-hero-toolbar schedule-hero-toolbar--compact">
            <button type="button" className="schedule-publish-link" onClick={() => setShowPublish(true)}>
              <IconGlobe size={16} />
              Выложить на сайт
              {publishSettings.is_published ? <span className="schedule-publish-live">live</span> : null}
            </button>
            <button type="button" className="schedule-hero-btn" onClick={handlePrint}>
              <IconPrinter size={16} />
              Печать
            </button>
            <button type="button" className="schedule-hero-btn" onClick={() => setShowSocial(true)}>
              <IconShare size={16} />
              Соцсети
            </button>
            <Link href="/dashboard/settings?section=schedule" className="schedule-hero-btn">
              <IconSettings size={16} />
              Настройки
            </Link>
          </div>
          <div className="schedule-hero-stats schedule-hero-stats--compact">
            <div className="schedule-stat-card schedule-stat-card--compact">
              <span>Программ</span>
              <strong>{programs.length}</strong>
            </div>
            <div className="schedule-stat-card schedule-stat-card--compact">
              <span>Занятий</span>
              <strong>{slots.length}</strong>
            </div>
          </div>
        </div>
      </header>

      {message ? <div className="schedule-workspace-message">{message}</div> : null}

      <div className="schedule-workspace-body">
        <aside className="schedule-programs-panel">
          <div className="schedule-programs-panel-head">
            <strong>Каталог программ</strong>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти CYCLE, PILATES…"
              className="schedule-programs-search"
            />
          </div>
          <div className="schedule-programs-list">
            {filteredPrograms.map((program) => (
              <article
                key={program.id}
                className="schedule-program-card"
                draggable={!busy}
                onDragStart={(event) => {
                  beginDrag();
                  event.dataTransfer.setData(DRAG_PROGRAM, String(program.id));
                  event.dataTransfer.effectAllowed = "copy";
                }}
                style={{
                  background: `linear-gradient(135deg, ${program.color}18 0%, #ffffff 55%)`,
                  borderColor: `${program.color}55`,
                }}
              >
                <div className="schedule-program-card-top">
                  <span className="schedule-program-grip" style={{ color: program.color }}>
                    <IconGrip size={14} />
                  </span>
                  <div className="schedule-program-card-title">
                    <strong>{program.title}</strong>
                    <span className="schedule-program-code" style={{ background: `${program.color}22`, color: program.color }}>
                      {program.code}
                    </span>
                  </div>
                </div>
                <p>{program.description}</p>
              </article>
            ))}
          </div>
        </aside>

        <section className="schedule-board-panel">
          {loadingWeek ? <div className="schedule-week-loading">Загрузка недели…</div> : null}
          <div className="schedule-board">
            <div className="schedule-board-time-col">
              <div className="schedule-board-time-spacer" aria-hidden="true">
                <div className="schedule-day-header schedule-day-header--ghost">
                  <span>&nbsp;</span>
                  <small>&nbsp;</small>
                </div>
              </div>
              <div className="schedule-board-time-grid" style={{ height: boardHeight }}>
                {HOURS.map((hour) => (
                  <div key={hour} className="schedule-board-hour" style={{ height: HOUR_HEIGHT }}>
                    {pad(hour)}:00
                  </div>
                ))}
              </div>
            </div>

            <ScheduleWeekSwiper weekStart={weekStart} onWeekChange={setWeekStart}>
              {(slideWeekStart, weekDays) => (
                <div className="schedule-board-days" data-week={slideWeekStart.toISOString()}>
                  {weekDays.map((date) => {
                    const sessionDate = formatLocalDate(date);
                    const weekday = weekdayIndex(date);
                    const isWeekend = weekday >= 5;
                    const daySlots = slotsByDate.get(sessionDate) ?? [];
                    const today = isToday(date);
                    return (
                      <div
                        key={sessionDate}
                        className={`schedule-day-column${isWeekend ? " schedule-day-column--weekend" : ""}${today ? " schedule-day-column--today" : ""}`}
                      >
                        <header className={`schedule-day-header${today ? " schedule-day-header--today" : ""}`}>
                          <span>{formatDayDate(date)}</span>
                          <small>{WEEKDAYS[weekday]}</small>
                          {today ? <b className="schedule-day-today-badge">сегодня</b> : null}
                          <em>{daySlots.length}</em>
                        </header>
                        <div
                          ref={(node) => {
                            dayRefs.current[sessionDate] = node;
                          }}
                          className={`schedule-day-body${dragOverDate === sessionDate ? " schedule-day-body--active" : ""}`}
                          style={{ height: boardHeight }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = event.dataTransfer.types.includes(DRAG_SLOT) ? "move" : "copy";
                            setDragOverDate(sessionDate);
                          }}
                          onDragLeave={(event) => {
                            if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                            setDragOverDate((prev) => (prev === sessionDate ? null : prev));
                          }}
                          onDrop={(event) => handleDayDrop(sessionDate, event)}
                        >
                          {HOURS.map((hour) => (
                            <div key={hour} className="schedule-day-gridline" style={{ height: HOUR_HEIGHT }} />
                          ))}

                          {daySlots.map((slot) => {
                            const program = programsById.get(slot.program);
                            const color = slotColor(slot, program);
                            const position = slotPosition(slot.start_time, slot.end_time);
                            return (
                              <div
                                key={slot.id}
                                className="schedule-event"
                                style={{
                                  ...position,
                                  background: `linear-gradient(145deg, ${color} 0%, ${color}dd 100%)`,
                                  boxShadow: `0 8px 20px ${color}44`,
                                }}
                              >
                                <div className="schedule-event-toolbar">
                                  <button
                                    type="button"
                                    className="schedule-event-grip"
                                    draggable={!busy}
                                    aria-label="Переместить"
                                    onDragStart={(event) => {
                                      beginDrag();
                                      event.stopPropagation();
                                      event.dataTransfer.setData(DRAG_SLOT, String(slot.id));
                                      event.dataTransfer.effectAllowed = "move";
                                    }}
                                  >
                                    <IconGrip size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    className="schedule-event-edit"
                                    aria-label="Редактировать"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openEdit(slot, date);
                                    }}
                                  >
                                    <IconPencil size={12} />
                                  </button>
                                </div>
                                <button type="button" className="schedule-event-body" onClick={() => openEdit(slot, date)}>
                                  <strong>{slotTitle(slot)}</strong>
                                  <span>
                                    {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                                  </span>
                                  <span className="schedule-event-capacity">
                                    {slot.enrollment_count ?? 0}/{slot.max_participants_effective ?? 20}
                                  </span>
                                  {slot.room ? <em>{slot.room}</em> : null}
                                  {slot.trainer_display ? <em>{slot.trainer_display}</em> : null}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScheduleWeekSwiper>
          </div>
        </section>
      </div>

      {showPublish ? (
        <SchedulePublishModal
          companySlug={companySlug}
          settings={publishSettings}
          onClose={() => setShowPublish(false)}
          onUpdated={(next) => setPublishSettings(next)}
        />
      ) : null}

      {showSocial ? (
        <ScheduleSocialModal
          companyName={companyName}
          weekStart={weekStart}
          slots={slots}
          onClose={() => setShowSocial(false)}
        />
      ) : null}

      {edit ? (
        <SlotEditorModal
          slot={edit.slot}
          slotDate={edit.slotDate}
          program={edit.program}
          programs={programs}
          trainers={trainers}
          clients={clients}
          busy={busy}
          onClose={() => setEdit(null)}
          onSave={saveEdit}
          onDelete={() => void removeSlot(edit.slot.id)}
          onEnrollmentChange={(slotId, count) => {
            setSlots((prev) =>
              prev.map((item) => (item.id === slotId ? { ...item, enrollment_count: count } : item)),
            );
            if (edit.slot.id === slotId) {
              setEdit((current) =>
                current ? { ...current, slot: { ...current.slot, enrollment_count: count } } : current,
              );
            }
          }}
        />
      ) : null}
    </div>
  );
}

function SlotEditorModal({
  slot,
  slotDate,
  program,
  programs,
  trainers,
  clients,
  busy,
  onClose,
  onSave,
  onDelete,
  onEnrollmentChange,
}: {
  slot: GroupScheduleSlotRecord;
  slotDate: Date | null;
  program: GroupProgramRecord;
  programs: GroupProgramRecord[];
  trainers: TrainerRecord[];
  clients: ClientRecord[];
  busy: boolean;
  onClose: () => void;
  onSave: (payload: {
    program: number;
    custom_title: string;
    max_participants: number | null;
    room: string;
    trainer_name: string;
    trainer: number | null;
    description: string;
    restrictions: string;
    start_time: string;
    end_time: string;
    session_date: string;
    color: string;
  }) => void;
  onDelete: () => void;
  onEnrollmentChange: (slotId: number, count: number) => void;
}) {
  const [programId, setProgramId] = useState(String(slot.program));
  const [customTitle, setCustomTitle] = useState(slot.custom_title);
  const [maxParticipants, setMaxParticipants] = useState(
    slot.max_participants ? String(slot.max_participants) : "",
  );
  const [sessionDate, setSessionDate] = useState(slot.session_date);
  const [color, setColor] = useState(slot.color || slot.display_color || program.color);
  const [room, setRoom] = useState(slot.room);
  const [trainerName, setTrainerName] = useState(slot.trainer_name || slot.trainer_display);
  const [trainerId, setTrainerId] = useState(slot.trainer ? String(slot.trainer) : "");
  const [description, setDescription] = useState(slot.description || program.description);
  const [restrictions, setRestrictions] = useState(slot.restrictions);
  const [startTime, setStartTime] = useState(slot.start_time.slice(0, 5));
  const [endTime, setEndTime] = useState(slot.end_time.slice(0, 5));
  const [enrollments, setEnrollments] = useState<GroupSlotEnrollmentRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [enrollmentMessage, setEnrollmentMessage] = useState("");

  const selectedProgram = programs.find((item) => String(item.id) === programId) ?? program;
  const heroColor = color || selectedProgram.color;
  const confirmedCount = enrollments.filter((item) => item.status === "confirmed").length;

  useEffect(() => {
    let active = true;
    void listSlotEnrollmentsAction(slot.id)
      .then((items) => {
        if (active) setEnrollments(items);
      })
      .catch(() => {
        if (active) setEnrollments([]);
      });
    return () => {
      active = false;
    };
  }, [slot.id]);

  async function addEnrollment() {
    if (!selectedClientId) return;
    setEnrollmentMessage("");
    try {
      const created = await createSlotEnrollmentAction(slot.id, { client: Number(selectedClientId) });
      setEnrollments((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      setSelectedClientId("");
      const nextCount = confirmedCount + 1;
      onEnrollmentChange(slot.id, nextCount);
    } catch (error) {
      setEnrollmentMessage(error instanceof Error ? error.message : "Не удалось записать клиента");
    }
  }

  async function removeEnrollment(enrollmentId: number) {
    setEnrollmentMessage("");
    try {
      await deleteSlotEnrollmentAction(slot.id, enrollmentId);
      setEnrollments((prev) => prev.filter((item) => item.id !== enrollmentId));
      onEnrollmentChange(slot.id, Math.max(0, confirmedCount - 1));
    } catch (error) {
      setEnrollmentMessage(error instanceof Error ? error.message : "Не удалось удалить запись");
    }
  }

  return (
    <div className="schedule-modal-backdrop" onClick={onClose}>
      <div className="schedule-modal schedule-modal--wide" onClick={(event) => event.stopPropagation()}>
        <div
          className="schedule-modal-hero"
          style={{ background: `linear-gradient(135deg, ${heroColor} 0%, ${heroColor}cc 100%)` }}
        >
          <div>
            <span className="schedule-modal-code">{selectedProgram.code}</span>
            <h2>{customTitle || selectedProgram.title}</h2>
            <p>
              {formatFullDate(slotDate ?? parseLocalDate(sessionDate))} · {startTime} – {endTime}
            </p>
          </div>
          <button type="button" className="schedule-modal-close" onClick={onClose} aria-label="Закрыть">
            <IconClose size={18} />
          </button>
        </div>

        <div className="schedule-modal-grid">
          <label>
            Программа
            <select value={programId} onChange={(event) => setProgramId(event.target.value)}>
              {programs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Дата занятия
            <input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} />
          </label>
          <label>
            Своё название
            <input
              value={customTitle}
              onChange={(event) => setCustomTitle(event.target.value)}
              placeholder={selectedProgram.title}
            />
          </label>
          <label>
            Макс. участников
            <input
              type="number"
              min={1}
              value={maxParticipants}
              onChange={(event) => setMaxParticipants(event.target.value)}
              placeholder={`По умолчанию: ${slot.max_participants_effective}`}
            />
          </label>
          <label className="schedule-modal-full schedule-modal-color-field">
            Цвет плашки
            <div className="schedule-color-picker">
              {SLOT_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`schedule-color-swatch${color === preset ? " schedule-color-swatch--active" : ""}`}
                  style={{ background: preset }}
                  aria-label={`Цвет ${preset}`}
                  onClick={() => setColor(preset)}
                />
              ))}
              <label className="schedule-color-custom">
                <span>Свой</span>
                <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
              </label>
              <button type="button" className="schedule-color-reset" onClick={() => setColor(selectedProgram.color)}>
                Как у программы
              </button>
            </div>
          </label>
          <label>
            Начало
            <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label>
            Окончание
            <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </label>
          <label>
            Зал
            <input value={room} onChange={(event) => setRoom(event.target.value)} placeholder="Зал 1, Cycle Studio…" />
          </label>
          <label>
            Тренер из базы
            <select
              value={trainerId}
              onChange={(event) => {
                setTrainerId(event.target.value);
                const trainer = trainers.find((item) => String(item.id) === event.target.value);
                if (trainer) setTrainerName(trainer.full_name);
              }}
            >
              <option value="">Не выбран</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="schedule-modal-full">
            Имя тренера
            <input value={trainerName} onChange={(event) => setTrainerName(event.target.value)} placeholder="Или введите вручную" />
          </label>
          <label className="schedule-modal-full">
            Описание занятия
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </label>
          <label className="schedule-modal-full">
            Ограничения
            <textarea
              value={restrictions}
              onChange={(event) => setRestrictions(event.target.value)}
              rows={2}
              placeholder="16+, средний уровень, противопоказания…"
            />
          </label>
        </div>

        <section className="schedule-modal-enrollments">
          <div className="schedule-modal-enrollments-head">
            <strong>Записались ({confirmedCount})</strong>
            <span>
              {confirmedCount}/{slot.max_participants_effective} мест
            </span>
          </div>
          {enrollmentMessage ? <p className="schedule-modal-enrollment-error">{enrollmentMessage}</p> : null}
          <div className="schedule-modal-enrollment-add">
            <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
              <option value="">Выберите клиента…</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name}
                  {client.phone ? ` · ${client.phone}` : ""}
                </option>
              ))}
            </select>
            <button type="button" className="schedule-modal-save" disabled={busy || !selectedClientId} onClick={() => void addEnrollment()}>
              Записать
            </button>
          </div>
          <div className="schedule-modal-enrollment-list">
            {enrollments.length === 0 ? (
              <p className="schedule-modal-enrollment-empty">Пока никто не записан на это занятие.</p>
            ) : (
              enrollments.map((item) => (
                <article key={item.id} className="schedule-modal-enrollment-item">
                  <div>
                    <strong>{item.client_name}</strong>
                    {item.client_phone ? <span>{item.client_phone}</span> : null}
                  </div>
                  <button type="button" className="schedule-modal-delete" onClick={() => void removeEnrollment(item.id)}>
                    Убрать
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <div className="schedule-modal-actions">
          <button type="button" className="schedule-modal-delete" disabled={busy} onClick={onDelete}>
            Удалить занятие
          </button>
          <button
            type="button"
            className="schedule-modal-save"
            disabled={busy}
            onClick={() =>
              onSave({
                program: Number(programId),
                custom_title: customTitle,
                max_participants: maxParticipants ? Number(maxParticipants) : null,
                room,
                trainer_name: trainerName,
                trainer: trainerId ? Number(trainerId) : null,
                description,
                restrictions,
                start_time: startTime,
                end_time: endTime,
                session_date: sessionDate,
                color,
              })
            }
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
