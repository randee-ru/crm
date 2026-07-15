"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import {
  createGroupProgramAction,
  createGroupScheduleSlotAction,
  createSlotEnrollmentAction,
  deleteGroupProgramAction,
  deleteGroupScheduleSlotAction,
  deleteSlotEnrollmentAction,
  listGroupScheduleSlotsAction,
  listSlotEnrollmentsAction,
  updateGroupProgramAction,
  updateGroupScheduleSlotAction,
} from "@/app/actions/schedule";
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconGlobe,
  IconGrip,
  IconPencil,
  IconPrinter,
  IconSettings,
  IconShare,
} from "@/components/ui/app-icon";
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
import { listClientsAction } from "@/app/actions/clients";
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
const HOUR_HEIGHT = 82;
const SLOT_DRAG_THRESHOLD = 6;
const MENU_WIDTH = 220;
const MENU_HEIGHT = 120;
const MENU_OFFSET = 8;
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
  initialWeekStart: string;
};

type EditState = {
  slot: GroupScheduleSlotRecord;
  program: GroupProgramRecord;
  slotDate: Date | null;
};

type ProgramEditorState = {
  mode: "create" | "edit";
  program: GroupProgramRecord | null;
};

type ProgramMenuState = {
  program: GroupProgramRecord;
  x: number;
  y: number;
};

type SlotMenuState = {
  slot: GroupScheduleSlotRecord;
  x: number;
  y: number;
};

type DaySlotLayout = {
  slot: GroupScheduleSlotRecord;
  top: string;
  height: string;
  left: string;
  width: string;
};

type EnrollmentTooltipState = {
  slotId: number;
  x: number;
  y: number;
  title: string;
  items: GroupSlotEnrollmentRecord[];
  loading: boolean;
};

type SlotDragState = {
  slotId: number;
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  active: boolean;
};

const ENROLLMENT_STATUS_OPTIONS: Array<{
  value: GroupSlotEnrollmentRecord["status"];
  label: string;
}> = [
  { value: "confirmed", label: "Запланировано" },
  { value: "completed", label: "Проведено" },
  { value: "cancelled", label: "Отменено" },
  { value: "waitlist", label: "Лист ожидания" },
];

function enrollmentStatusLabel(status: GroupSlotEnrollmentRecord["status"]): string {
  return ENROLLMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

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
  const height = Math.max(((end - start) / span) * 100, 7);
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

function clampMenuPosition(clientX: number, clientY: number) {
  const x = Math.max(MENU_OFFSET, Math.min(clientX + MENU_OFFSET, window.innerWidth - MENU_WIDTH - MENU_OFFSET));
  const y = Math.max(MENU_OFFSET, Math.min(clientY + MENU_OFFSET, window.innerHeight - MENU_HEIGHT - MENU_OFFSET));
  return { x, y };
}

function formatEnrollmentTimestamp(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildDaySlotLayouts(daySlots: GroupScheduleSlotRecord[]): DaySlotLayout[] {
  if (daySlots.length === 0) return [];

  const items = daySlots
    .map((slot) => ({
      slot,
      start: Math.max(timeToMinutes(slot.start_time), DAY_START_MINUTES),
      end: Math.min(timeToMinutes(slot.end_time), DAY_END_MINUTES),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end || a.slot.id - b.slot.id);

  const layouts: DaySlotLayout[] = [];
  let component: typeof items = [];
  let currentEnd = -1;

  const flushComponent = (componentItems: typeof items) => {
    if (componentItems.length === 0) return;

    const active: { end: number; laneIndex: number }[] = [];
    const assigned: Array<{ item: (typeof items)[number]; laneIndex: number }> = [];
    let maxLane = -1;

    for (const item of componentItems) {
      for (let index = active.length - 1; index >= 0; index -= 1) {
        if (active[index].end <= item.start) {
          active.splice(index, 1);
        }
      }

      const used = new Set(active.map((entry) => entry.laneIndex));
      let laneIndex = 0;
      while (used.has(laneIndex)) {
        laneIndex += 1;
      }

      active.push({ end: item.end, laneIndex });
      maxLane = Math.max(maxLane, laneIndex);
      assigned.push({ item, laneIndex });
    }

    for (const { item, laneIndex } of assigned) {
      const top = ((item.start - DAY_START_MINUTES) / (DAY_END_MINUTES - DAY_START_MINUTES)) * 100;
      const durationMinutes = item.end - item.start;
      const heightPx = Math.max((durationMinutes / 60) * HOUR_HEIGHT - 6, 78);
      const stackOffsetPx = laneIndex * 26;
      layouts.push({
        slot: item.slot,
        top: laneIndex === 0 ? `${top}%` : `calc(${top}% + ${stackOffsetPx}px)`,
        height: `${heightPx}px`,
        left: "0.35rem",
        width: "calc(100% - 0.7rem)",
      });
    }
  };

  for (const item of items) {
    if (component.length > 0 && item.start >= currentEnd) {
      flushComponent(component);
      component = [item];
      currentEnd = item.end;
      continue;
    }
    component.push(item);
    currentEnd = component.length === 1 ? item.end : Math.max(currentEnd, item.end);
  }
  flushComponent(component);
  return layouts;
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
  initialWeekStart,
}: ScheduleWorkspaceProps) {
  const [weekStart, setWeekStart] = useState(() => parseLocalDate(initialWeekStart));
  const [slots, setSlots] = useState(initialSlots);
  const [programList, setProgramList] = useState(programs);
  const [query, setQuery] = useState("");
  const [isProgramsCollapsed, setIsProgramsCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("schedule-programs-collapsed") === "1";
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [programEditor, setProgramEditor] = useState<ProgramEditorState | null>(null);
  const [programMenu, setProgramMenu] = useState<ProgramMenuState | null>(null);
  const [slotMenu, setSlotMenu] = useState<SlotMenuState | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [publishSettings, setPublishSettings] = useState(scheduleSettings);
  const [draggingSlotId, setDraggingSlotId] = useState<number | null>(null);
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const slotDragRef = useRef<SlotDragState | null>(null);
  const programMenuRef = useRef<HTMLDivElement | null>(null);
  const slotMenuRef = useRef<HTMLDivElement | null>(null);
  const skipInitialWeekFetch = useRef(true);

  useEffect(() => {
    setProgramList(programs);
  }, [programs]);

  useEffect(() => {
    window.localStorage.setItem("schedule-programs-collapsed", isProgramsCollapsed ? "1" : "0");
  }, [isProgramsCollapsed]);

  const programsById = useMemo(() => new Map(programList.map((item) => [item.id, item])), [programList]);
  const groupTrainers = useMemo(
    () =>
      trainers
        .filter((trainer) => trainer.is_active && trainer.trains_group_programs)
        .sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)),
    [trainers],
  );

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

  useEffect(() => {
    return () => {
      slotDragRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!programMenu) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (programMenuRef.current && event.target instanceof Node && programMenuRef.current.contains(event.target)) {
        return;
      }
      setProgramMenu(null);
    };
    const closeMenu = () => setProgramMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [programMenu]);

  useEffect(() => {
    if (!slotMenu) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (slotMenuRef.current && event.target instanceof Node && slotMenuRef.current.contains(event.target)) {
        return;
      }
      setSlotMenu(null);
    };
    const closeMenu = () => setSlotMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [slotMenu]);

  const filteredPrograms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return programList;
    return programList.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.code.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized),
    );
  }, [programList, query]);

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

  function makeUniqueProgramTitle(baseTitle: string) {
    const existing = new Set(programList.map((item) => item.title.trim().toLowerCase()));
    const normalizedBase = baseTitle.trim();
    if (!existing.has(normalizedBase.toLowerCase())) {
      return normalizedBase;
    }
    let index = 2;
    while (existing.has(`${normalizedBase.toLowerCase()} (копия ${index})`)) {
      index += 1;
    }
    return `${normalizedBase} (копия ${index})`;
  }

  function sortVisiblePrograms(items: GroupProgramRecord[]) {
    return items
      .filter((item) => item.is_active)
      .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
  }

  function openCreateProgram() {
    setProgramEditor({ mode: "create", program: null });
  }

  function openEditProgram(program: GroupProgramRecord) {
    setProgramEditor({ mode: "edit", program });
  }

  async function saveProgram(payload: {
    trainer: number | null;
    room: string;
    title: string;
    code: string;
    description: string;
    color: string;
    sort_order: number;
    is_active: boolean;
  }) {
    setBusy(true);
    setMessage("");
    try {
      if (programEditor?.mode === "edit" && programEditor.program) {
        const updated = await updateGroupProgramAction(programEditor.program.id, payload);
        setProgramList((prev) => sortVisiblePrograms(prev.map((item) => (item.id === updated.id ? updated : item))));
        setProgramEditor(null);
        return;
      }
      const created = await createGroupProgramAction(payload);
      setProgramList((prev) => sortVisiblePrograms([...prev, created]));
      setProgramEditor(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить направление");
    } finally {
      setBusy(false);
    }
  }

  async function removeProgram(programId: number) {
    setBusy(true);
    setMessage("");
    try {
      await deleteGroupProgramAction(programId);
      setProgramList((prev) => prev.filter((item) => item.id !== programId));
      setProgramMenu(null);
      if (programEditor?.program?.id === programId) {
        setProgramEditor(null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось удалить направление");
    } finally {
      setBusy(false);
    }
  }

  async function copyProgram(program: GroupProgramRecord) {
    setBusy(true);
    setMessage("");
    try {
      const copiedTrainer = program.trainer && groupTrainers.some((item) => item.id === program.trainer) ? program.trainer : null;
      const created = await createGroupProgramAction({
        trainer: copiedTrainer,
        room: program.room,
        title: makeUniqueProgramTitle(program.title),
        code: program.code ? `${program.code}-COPY` : "",
        description: program.description,
        color: program.color,
        sort_order: program.sort_order + 1,
        is_active: program.is_active,
      });
      setProgramList((prev) => sortVisiblePrograms([...prev, created]));
      setProgramMenu(null);
      setProgramEditor({ mode: "edit", program: created });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось скопировать направление");
    } finally {
      setBusy(false);
    }
  }

  async function copySlot(slot: GroupScheduleSlotRecord) {
    setBusy(true);
    setMessage("");
    try {
      const copiedTrainer = slot.trainer && groupTrainers.some((item) => item.id === slot.trainer) ? slot.trainer : null;
      const created = await createGroupScheduleSlotAction({
        program: slot.program,
        session_date: slot.session_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        room: slot.room,
        trainer_name: slot.trainer_name,
        trainer: copiedTrainer,
        description: slot.description,
        restrictions: slot.restrictions,
        custom_title: slot.custom_title,
        color: slot.color,
        max_participants: slot.max_participants,
        branch: slot.branch,
        is_active: slot.is_active,
      });
      setSlots((prev) => [...prev, created]);
      setSlotMenu(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось скопировать занятие");
    } finally {
      setBusy(false);
    }
  }

  function beginDrag() {
    setIsDragging(true);
  }

  function clearSlotDragState() {
    slotDragRef.current = null;
    setDragOverDate(null);
    setDraggingSlotId(null);
    setIsDragging(false);
  }

  function findDayBodyAtPoint(clientX: number, clientY: number) {
    const element = document.elementFromPoint(clientX, clientY);
    const body = element instanceof Element ? element.closest<HTMLElement>(".schedule-day-body") : null;
    const sessionDate = body?.dataset.sessionDate;
    if (!sessionDate) return null;
    const ref = dayRefs.current[sessionDate];
    return {
      sessionDate,
      body: ref ?? body,
    };
  }

  function startSlotDrag(slot: GroupScheduleSlotRecord, event: React.PointerEvent<HTMLDivElement>) {
    if (busy || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("button")) return;

    event.preventDefault();
    event.stopPropagation();

    const dragTarget = event.currentTarget;
    const nextState: SlotDragState = {
      slotId: slot.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      active: false,
    };
    slotDragRef.current = nextState;
    try {
      dragTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore browsers that do not support pointer capture in this context.
    }

    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      try {
        dragTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore capture release errors.
      }
      clearSlotDragState();
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const current = slotDragRef.current;
      if (!current || current.pointerId !== moveEvent.pointerId) return;

      current.currentX = moveEvent.clientX;
      current.currentY = moveEvent.clientY;

      const distance = Math.hypot(moveEvent.clientX - current.startX, moveEvent.clientY - current.startY);
      if (!current.active && distance < SLOT_DRAG_THRESHOLD) {
        return;
      }

      if (!current.active) {
        current.active = true;
        setDraggingSlotId(current.slotId);
        setIsDragging(true);
      }

      const targetDay = findDayBodyAtPoint(moveEvent.clientX, moveEvent.clientY);
      setDragOverDate(targetDay?.sessionDate ?? null);
      moveEvent.preventDefault();
    };

    const handlePointerUp = (endEvent: PointerEvent) => {
      const current = slotDragRef.current;
      if (!current || current.pointerId !== endEvent.pointerId) {
        cleanup();
        return;
      }

      const targetDay = current.active ? findDayBodyAtPoint(endEvent.clientX, endEvent.clientY) : null;
      if (current.active && targetDay?.body) {
        const rect = targetDay.body.getBoundingClientRect();
        const startMinutes = snapMinutesFromPointer(endEvent.clientY - rect.top);
        void moveSlot(current.slotId, targetDay.sessionDate, startMinutes);
      }

      cleanup();
    };

    const handlePointerCancel = () => {
      cleanup();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
  }

  async function createSlot(programId: number, sessionDate: string, startMinutes: number) {
    const start_time = minutesToTime(startMinutes);
    const end_time = minutesToTime(clampSlotEnd(startMinutes, 55));
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

  function openProgramMenu(program: GroupProgramRecord, event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
    setProgramMenu({
      program,
      ...clampMenuPosition(event.clientX, event.clientY),
    });
  }

  function openSlotMenu(slot: GroupScheduleSlotRecord, event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
    setSlotMenu({
      slot,
      ...clampMenuPosition(event.clientX, event.clientY),
    });
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

  const workspaceStyle = {
    "--schedule-programs-width": isProgramsCollapsed ? "48px" : "320px",
  } as CSSProperties;

  return (
    <div className={`schedule-workspace${isDragging ? " schedule-workspace--dragging" : ""}`} style={workspaceStyle}>
      <header className="schedule-hero">
        <div className="schedule-hero-copy">
          <span className="schedule-hero-badge">Групповые программы</span>
          <h1>Расписание</h1>
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
        </div>
      </header>

      {message ? <div className="schedule-workspace-message">{message}</div> : null}

      <div className="schedule-workspace-body">
        <aside className={`schedule-programs-panel${isProgramsCollapsed ? " schedule-programs-panel--collapsed" : ""}`}>
          {isProgramsCollapsed ? (
            <button
              type="button"
              className="schedule-programs-collapse schedule-programs-collapse--floating"
              onClick={() => setIsProgramsCollapsed((value) => !value)}
              aria-label="Развернуть каталог"
              title="Развернуть каталог"
            >
              <IconChevronRight size={15} />
            </button>
          ) : (
            <>
              <div className="schedule-programs-panel-head">
                <div className="schedule-programs-panel-head-row">
                  <div className="schedule-programs-panel-title-wrap">
                    <strong>Каталог программ</strong>
                  </div>
                  <div className="schedule-programs-panel-actions">
                    <button
                      type="button"
                      className="schedule-programs-collapse"
                      onClick={() => setIsProgramsCollapsed((value) => !value)}
                      aria-label="Свернуть каталог"
                    >
                      <IconChevronLeft size={15} />
                    </button>
                    <button type="button" className="schedule-programs-add" onClick={openCreateProgram}>
                      + Направление
                    </button>
                  </div>
                </div>
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
                    onContextMenu={(event) => openProgramMenu(program, event)}
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
                      <button
                        type="button"
                        className="schedule-program-card-menu"
                        aria-label="Действия направления"
                        onClick={(event) => {
                          event.stopPropagation();
                          setProgramMenu((current) =>
                            current && current.program.id === program.id ? null : { program, ...clampMenuPosition(event.clientX, event.clientY) },
                          );
                        }}
                      >
                        •••
                      </button>
                    </div>
                    <p>{program.description}</p>
                    {program.room || program.trainer_display ? (
                      <div className="schedule-program-card-meta">
                        {program.room ? <span>{program.room}</span> : null}
                        {program.trainer_display ? <span>{program.trainer_display}</span> : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          )}
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

            <ScheduleWeekSwiper
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              stats={[
                { label: "Программ", value: programList.length },
                { label: "Занятий", value: slots.length },
              ]}
            >
              {(slideWeekStart, weekDays) => (
                <div className="schedule-board-days" data-week={slideWeekStart.toISOString()}>
                  {weekDays.map((date) => {
                    const sessionDate = formatLocalDate(date);
                    const weekday = weekdayIndex(date);
                    const isWeekend = weekday >= 5;
                    const daySlots = slotsByDate.get(sessionDate) ?? [];
                    const daySlotLayouts = buildDaySlotLayouts(daySlots);
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
                          data-session-date={sessionDate}
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

                          {daySlotLayouts.map(({ slot, top, height, left, width }) => {
                            const program = programsById.get(slot.program);
                            const color = slotColor(slot, program);
                            return (
                              <div
                                key={slot.id}
                                className={`schedule-event${draggingSlotId === slot.id ? " schedule-event--dragging" : ""}`}
                                style={{
                                  top,
                                  height,
                                  left,
                                  width,
                                  background: `linear-gradient(145deg, ${color} 0%, ${color}dd 100%)`,
                                  boxShadow: `0 8px 20px ${color}44`,
                                }}
                                onContextMenu={(event) => openSlotMenu(slot, event)}
                              >
                                <div
                                  className="schedule-event-toolbar"
                                  onPointerDown={(pointerEvent) => startSlotDrag(slot, pointerEvent)}
                                >
                                  <span className="schedule-event-grip" aria-hidden="true">
                                    <IconGrip size={12} />
                                  </span>
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
                                  <span className="schedule-event-capacity schedule-event-capacity--full">
                                    Записано {slot.enrollment_count ?? 0} из {slot.max_participants_effective ?? 20}
                                  </span>
                                  {slot.room ? <span className="schedule-event-room">{slot.room}</span> : null}
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

      {typeof document !== "undefined" && programMenu
        ? createPortal(
            <div
              ref={programMenuRef}
              className="schedule-program-menu"
              style={{ left: `${programMenu.x}px`, top: `${programMenu.y}px` }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" onClick={() => void copyProgram(programMenu.program)}>
                Скопировать
              </button>
              <button
                type="button"
                onClick={() => {
                  setProgramMenu(null);
                  openEditProgram(programMenu.program);
                }}
              >
                Редактировать
              </button>
              <button type="button" onClick={() => void removeProgram(programMenu.program.id)}>
                Удалить
              </button>
            </div>,
            document.body,
          )
        : null}

      {typeof document !== "undefined" && slotMenu
        ? createPortal(
            <div
              ref={slotMenuRef}
              className="schedule-program-menu"
              style={{ left: `${slotMenu.x}px`, top: `${slotMenu.y}px` }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" onClick={() => void copySlot(slotMenu.slot)}>
                Копировать
              </button>
              <button
                type="button"
                onClick={() => {
                  openEdit(slotMenu.slot);
                  setSlotMenu(null);
                }}
              >
                Редактировать
              </button>
            </div>,
            document.body,
          )
        : null}

      {edit ? (
        <SlotEditorModal
          slot={edit.slot}
          slotDate={edit.slotDate}
          program={edit.program}
          programs={programList}
          trainers={groupTrainers}
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

      {programEditor ? (
        <ProgramEditorModal
          mode={programEditor.mode}
          program={programEditor.program}
          trainers={groupTrainers}
          busy={busy}
          onClose={() => setProgramEditor(null)}
          onSave={saveProgram}
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
  const trainerOptions = trainers;
  const [programId, setProgramId] = useState(String(slot.program));
  const [customTitle, setCustomTitle] = useState(slot.custom_title);
  const [maxParticipants, setMaxParticipants] = useState(
    slot.max_participants ? String(slot.max_participants) : "",
  );
  const [sessionDate, setSessionDate] = useState(slot.session_date);
  const [color, setColor] = useState(slot.color || slot.display_color || program.color);
  const [room, setRoom] = useState(slot.room);
  const [trainerName, setTrainerName] = useState(slot.trainer_name || slot.trainer_display);
  const [trainerId, setTrainerId] = useState(
    slot.trainer && trainerOptions.some((item) => item.id === slot.trainer) ? String(slot.trainer) : "",
  );
  const [description, setDescription] = useState(slot.description || program.description);
  const [restrictions, setRestrictions] = useState(slot.restrictions);
  const [startTime, setStartTime] = useState(slot.start_time.slice(0, 5));
  const [endTime, setEndTime] = useState(slot.end_time.slice(0, 5));
  const [enrollments, setEnrollments] = useState<GroupSlotEnrollmentRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientRecord[]>([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [clientSearchTotal, setClientSearchTotal] = useState<number | null>(null);
  const [clientSearchHint, setClientSearchHint] = useState("Показываем активных клиентов");
  const [enrollmentMessage, setEnrollmentMessage] = useState("");

  const selectedProgram = programs.find((item) => String(item.id) === programId) ?? program;
  const heroColor = color || selectedProgram.color;
  const occupiedCount = enrollments.filter((item) => item.status === "confirmed" || item.status === "completed").length;

  useEffect(() => {
    const query = clientSearch.trim();
    let active = true;
    setClientSearchLoading(true);
    setClientSearchHint(query.length >= 3 ? "Ищем активных клиентов…" : "Показываем активных клиентов");
    const localMatches = query
      ? clients.filter((client) =>
          [client.full_name, client.phone, client.email]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(query.toLowerCase())),
        )
      : clients;
    const timeoutId = window.setTimeout(() => {
      const loadClients = async () => {
        try {
          const activePage = await listClientsAction({
            search: query.length >= 3 ? query : undefined,
            isActive: true,
            page: 1,
          });

          if (!active) {
            return;
          }

          if (query.length < 3 || activePage.results.length > 0) {
            setClientOptions(activePage.results.length > 0 ? activePage.results : localMatches);
            setClientSearchTotal(activePage.count);
            setClientSearchHint(
              query.length >= 3
                ? `Найдено активных клиентов: ${activePage.count}`
                : `Показываем активных клиентов: ${activePage.count}`,
            );
            return;
          }

          const allPage = await listClientsAction({
            search: query,
            page: 1,
          });

          if (!active) {
            return;
          }

          const fallback = allPage.results.length > 0 ? allPage.results : localMatches;
          setClientOptions(fallback);
          setClientSearchTotal(allPage.count);
          setClientSearchHint(
            allPage.results.length > 0
              ? `В базе найдено: ${allPage.count}`
              : localMatches.length > 0
                ? `Локально найдено совпадений: ${localMatches.length}`
                : `Активных не нашли, но в базе найдено: ${allPage.count}`,
          );
        } catch {
          if (active) {
            setClientOptions(localMatches);
            setClientSearchTotal(localMatches.length);
            setClientSearchHint(localMatches.length > 0 ? `Локально найдено совпадений: ${localMatches.length}` : "Ничего не найдено");
          }
        } finally {
          if (active) setClientSearchLoading(false);
        }
      };

      void loadClients();
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [clientSearch, clients]);

  const selectedClient = useMemo(
    () =>
      clientOptions.find((client) => String(client.id) === selectedClientId) ??
      clients.find((client) => String(client.id) === selectedClientId) ??
      null,
    [clientOptions, clients, selectedClientId],
  );
  const visibleClientResults = useMemo(() => clientOptions.slice(0, 12), [clientOptions]);
  const selectedClientBlocked = Boolean(
    selectedClient?.club_access_blocked || selectedClient?.group_programs_blocked,
  );
  const selectedClientBlockLabel = selectedClient?.club_access_blocked
    ? "Клиент заблокирован для входа в клуб"
    : selectedClient?.group_programs_blocked
      ? "Клиент заблокирован для групповых программ"
      : "";

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
    if (selectedClientBlocked) {
      setEnrollmentMessage(selectedClientBlockLabel || "Клиент заблокирован");
      return;
    }
    setEnrollmentMessage("");
    try {
      const created = await createSlotEnrollmentAction(slot.id, {
        client: Number(selectedClientId),
        status: "confirmed",
      });
      setEnrollments((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      setSelectedClientId("");
      setClientSearch("");
      onEnrollmentChange(slot.id, occupiedCount + 1);
    } catch (error) {
      setEnrollmentMessage(error instanceof Error ? error.message : "Не удалось записать клиента");
    }
  }

  async function removeEnrollment(enrollmentId: number) {
    setEnrollmentMessage("");
    try {
      await deleteSlotEnrollmentAction(slot.id, enrollmentId);
      setEnrollments((prev) => {
        const removed = prev.find((item) => item.id === enrollmentId);
        const next = prev.filter((item) => item.id !== enrollmentId);
        const nextCount = removed && (removed.status === "confirmed" || removed.status === "completed") ? Math.max(0, occupiedCount - 1) : occupiedCount;
        onEnrollmentChange(slot.id, nextCount);
        return next;
      });
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

        <div className="schedule-modal-content">
          <section className="schedule-modal-enrollments schedule-modal-enrollments--top">
            <div className="schedule-modal-enrollments-head">
              <strong>Записались ({occupiedCount})</strong>
              <span>
                {occupiedCount}/{slot.max_participants_effective} мест
              </span>
            </div>
            {enrollmentMessage ? <p className="schedule-modal-enrollment-error">{enrollmentMessage}</p> : null}
            <div className="schedule-modal-enrollment-add">
              <input
                value={clientSearch}
                onChange={(event) => setClientSearch(event.target.value)}
                placeholder="Поиск клиента"
                className="schedule-modal-client-search"
              />
              <div className="schedule-modal-client-list">
                {visibleClientResults.length === 0 ? (
                  <div className="schedule-modal-client-empty">
                    {clientSearch.trim().length >= 2 ? "Ничего не найдено" : "Введите имя, телефон или email"}
                  </div>
                ) : (
                  visibleClientResults.map((client) => {
                    const isSelected = String(client.id) === selectedClientId;
                    const isBlocked = client.club_access_blocked || client.group_programs_blocked;
                    return (
                      <button
                        key={client.id}
                        type="button"
                        className={`schedule-modal-client-option${isSelected ? " schedule-modal-client-option--active" : ""}${isBlocked ? " schedule-modal-client-option--blocked" : ""}`}
                        onClick={() => setSelectedClientId(String(client.id))}
                      >
                        <strong>{client.full_name}</strong>
                        <span>{[client.phone, client.email].filter(Boolean).join(" · ") || "Без контактов"}</span>
                      </button>
                    );
                  })
                )}
              </div>
              <button
                type="button"
                className="schedule-modal-save schedule-modal-save--compact"
                disabled={busy || !selectedClientId || selectedClientBlocked}
                onClick={() => void addEnrollment()}
              >
                {selectedClientBlocked ? "Клиент заблокирован" : "Записать"}
              </button>
            </div>
            <div className="schedule-modal-selected-client">
              {selectedClient ? (
                <>
                  <strong>{selectedClient.full_name}</strong>
                  <span>{[selectedClient.phone, selectedClient.email].filter(Boolean).join(" · ") || "Контакты не указаны"}</span>
                  {selectedClientBlocked ? <em>{selectedClientBlockLabel}</em> : null}
                </>
              ) : (
                <span>Выберите клиента из результатов поиска</span>
              )}
            </div>
            <p className="schedule-modal-enrollment-hint">
              {clientSearchLoading ? "Ищем клиентов…" : clientSearchHint}
            </p>
            <div className="schedule-modal-enrollment-list">
              {enrollments.length === 0 ? (
                <p className="schedule-modal-enrollment-empty">Пока никто не записан на это занятие.</p>
              ) : (
                enrollments.map((item) => (
                  <article key={item.id} className="schedule-modal-enrollment-item">
                    <div>
                      <strong>{item.client_name}</strong>
                      <span>
                        {item.client_phone || "Без телефона"} · {enrollmentStatusLabel(item.status)}
                      </span>
                    </div>
                    <button type="button" className="schedule-modal-delete" onClick={() => void removeEnrollment(item.id)}>
                      Убрать
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>

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
              {trainerOptions.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.full_name}
                </option>
              ))}
            </select>
            <span className="schedule-modal-field-hint">Показываем только тренеров групповых программ.</span>
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
        </div>

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

function ProgramEditorModal({
  mode,
  program,
  trainers,
  busy,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  program: GroupProgramRecord | null;
  trainers: TrainerRecord[];
  busy: boolean;
  onClose: () => void;
  onSave: (payload: {
    trainer: number | null;
    room: string;
    title: string;
    code: string;
    description: string;
    color: string;
    sort_order: number;
    is_active: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState(program?.title ?? "");
  const [code, setCode] = useState(program?.code ?? "");
  const [description, setDescription] = useState(program?.description ?? "");
  const [color, setColor] = useState(program?.color ?? "#2f6fed");
  const [sortOrder, setSortOrder] = useState(String(program?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(program?.is_active ?? true);
  const [room, setRoom] = useState(program?.room ?? "");
  const [trainerId, setTrainerId] = useState(
    program?.trainer && trainers.some((item) => item.id === program.trainer) ? String(program.trainer) : "",
  );

  useEffect(() => {
    setTitle(program?.title ?? "");
    setCode(program?.code ?? "");
    setDescription(program?.description ?? "");
    setColor(program?.color ?? "#2f6fed");
    setSortOrder(String(program?.sort_order ?? 0));
    setIsActive(program?.is_active ?? true);
    setRoom(program?.room ?? "");
    setTrainerId(program?.trainer && trainers.some((item) => item.id === program.trainer) ? String(program.trainer) : "");
  }, [program, trainers]);

  return (
    <div className="schedule-modal-backdrop" onClick={onClose}>
      <div className="schedule-modal schedule-modal--wide" onClick={(event) => event.stopPropagation()}>
        <div className="schedule-modal-hero" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}>
          <div>
            <span className="schedule-modal-code">{mode === "edit" ? "Направление" : "Новое направление"}</span>
            <h2>{title || "Без названия"}</h2>
            <p>Каталог групповых программ, плюс зал и тренер по умолчанию для будущих занятий.</p>
          </div>
          <button type="button" className="schedule-modal-close" onClick={onClose} aria-label="Закрыть">
            <IconClose size={18} />
          </button>
        </div>

        <div className="schedule-modal-grid">
          <label className="schedule-modal-full">
            Название
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, Йога" />
          </label>
          <label className="schedule-modal-full">
            Зал
            <input value={room} onChange={(event) => setRoom(event.target.value)} placeholder="Cycle Studio, Main Hall…" />
          </label>
          <label className="schedule-modal-full">
            Тренер
            <select
              value={trainerId}
              onChange={(event) => setTrainerId(event.target.value)}
            >
              <option value="">Не выбран</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.full_name}
                </option>
              ))}
            </select>
            <span className="schedule-modal-field-hint">Показываем только тренеров групповых программ.</span>
          </label>
          <label>
            Код
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="YOGA" />
          </label>
          <label>
            Порядок
            <input type="number" min={0} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
          </label>
          <label className="schedule-modal-full">
            Описание
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Короткое описание направления"
              rows={4}
            />
          </label>
          <label className="schedule-modal-full schedule-modal-color-field">
            Цвет
            <div className="schedule-color-picker">
              {SLOT_COLOR_PRESETS.slice(0, 10).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`schedule-color-swatch${color === preset ? " schedule-color-swatch--active" : ""}`}
                  style={{ background: preset }}
                  onClick={() => setColor(preset)}
                  aria-label={`Цвет ${preset}`}
                />
              ))}
              <label className="schedule-color-custom">
                <span>Свой</span>
                <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
              </label>
            </div>
          </label>
          <label className="schedule-modal-full schedule-program-active-field">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Активно в расписании
          </label>
        </div>

        <div className="schedule-modal-actions">
          <button type="button" className="schedule-modal-delete" disabled={busy} onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="schedule-modal-save"
            disabled={busy || !title.trim()}
            onClick={() =>
              onSave({
                trainer: trainerId ? Number(trainerId) : null,
                room,
                title: title.trim(),
                code: code.trim(),
                description: description.trim(),
                color,
                sort_order: Number(sortOrder) || 0,
                is_active: isActive,
              })
            }
          >
            {mode === "edit" ? "Сохранить" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}
