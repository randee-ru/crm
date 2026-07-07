import {
  addDays,
  formatDayDate,
  formatLocalDate,
  formatWeekRange,
  getWeekDays,
  parseLocalDate,
  weekdayIndex,
} from "@/lib/schedule-week";
import type { GroupScheduleSlotRecord } from "@/lib/types";

const WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

export type ScheduleExportSlot = {
  time: string;
  title: string;
  color: string;
  room: string;
  trainer: string;
};

export type ScheduleExportDay = {
  date: string;
  dateLabel: string;
  weekday: string;
  slots: ScheduleExportSlot[];
};

export type ScheduleExportData = {
  companyName: string;
  weekLabel: string;
  days: ScheduleExportDay[];
};

function slotColor(slot: GroupScheduleSlotRecord): string {
  return slot.color || slot.display_color || slot.program_color || "#2f6fed";
}

function slotTitle(slot: GroupScheduleSlotRecord): string {
  return slot.display_title || slot.custom_title || slot.program_title;
}

function formatTimeRange(start: string, end: string): string {
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

export function buildScheduleExportData(
  companyName: string,
  weekStart: Date,
  slots: GroupScheduleSlotRecord[],
): ScheduleExportData {
  const weekDays = getWeekDays(weekStart);
  const slotsByDate = new Map<string, GroupScheduleSlotRecord[]>();

  for (const slot of slots) {
    const bucket = slotsByDate.get(slot.session_date) ?? [];
    bucket.push(slot);
    slotsByDate.set(slot.session_date, bucket);
  }

  const days = weekDays.map((date) => {
    const sessionDate = formatLocalDate(date);
    const daySlots = (slotsByDate.get(sessionDate) ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time));
    return {
      date: sessionDate,
      dateLabel: formatDayDate(date),
      weekday: WEEKDAYS[weekdayIndex(date)],
      slots: daySlots.map((slot) => ({
        time: formatTimeRange(slot.start_time, slot.end_time),
        title: slotTitle(slot),
        color: slotColor(slot),
        room: slot.room,
        trainer: slot.trainer_display,
      })),
    };
  });

  return {
    companyName,
    weekLabel: formatWeekRange(weekStart),
    days,
  };
}

export function printScheduleA4(data: ScheduleExportData): void {
  const daysHtml = data.days
    .map((day) => {
      const slotsHtml =
        day.slots.length === 0
          ? `<p class="empty">—</p>`
          : day.slots
              .map(
                (slot) => `
          <div class="slot" style="border-left-color:${slot.color}">
            <strong>${escapeHtml(slot.time)} · ${escapeHtml(slot.title)}</strong>
            <span>${escapeHtml([slot.trainer, slot.room].filter(Boolean).join(" · "))}</span>
          </div>`,
              )
              .join("");

      return `
        <section class="day">
          <h3>${escapeHtml(day.dateLabel)} <small>${escapeHtml(day.weekday)}</small></h3>
          ${slotsHtml}
        </section>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Расписание — ${escapeHtml(data.companyName)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f1c2e; margin: 0; }
    header { display: flex; justify-content: space-between; align-items: end; margin-bottom: 14px; border-bottom: 2px solid #2f6fed; padding-bottom: 10px; }
    h1 { margin: 0; font-size: 22px; }
    .week { font-size: 13px; color: #667085; }
    .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
    .day { border: 1px solid #dfe6ef; border-radius: 10px; padding: 8px; min-height: 120px; }
    .day h3 { margin: 0 0 8px; font-size: 12px; }
    .day h3 small { display: block; color: #8a97a8; font-weight: 600; }
    .slot { border-left: 4px solid #2f6fed; padding: 4px 0 4px 8px; margin-bottom: 6px; }
    .slot strong { display: block; font-size: 10px; line-height: 1.35; }
    .slot span { display: block; font-size: 9px; color: #667085; }
    .empty { margin: 0; font-size: 10px; color: #8a97a8; }
    footer { margin-top: 12px; font-size: 10px; color: #8a97a8; text-align: right; }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="week">Расписание групповых занятий</div>
      <h1>${escapeHtml(data.companyName)}</h1>
    </div>
    <div class="week">${escapeHtml(data.weekLabel)}</div>
  </header>
  <div class="grid">${daysHtml}</div>
  <footer>CRM Kit · ${escapeHtml(new Date().toLocaleDateString("ru-RU"))}</footer>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.srcdoc = html;
  document.body.appendChild(frame);

  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup);
    frame.remove();
  };

  window.addEventListener("afterprint", cleanup);

  frame.onload = () => {
    const printWindow = frame.contentWindow;
    if (!printWindow) {
      cleanup();
      throw new Error("Не удалось открыть окно печати. Разрешите всплывающие окна.");
    }

    const startPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        cleanup();
        throw new Error("Не удалось открыть окно печати. Разрешите всплывающие окна.");
      }
    };

    setTimeout(startPrint, 50);
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export function renderScheduleStoryImage(data: ScheduleExportData): HTMLCanvasElement {
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas не поддерживается");

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#eef4ff");
  gradient.addColorStop(0.45, "#ffffff");
  gradient.addColorStop(1, "#f3f6fb");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#2f6fed";
  ctx.fillRect(0, 0, width, 8);

  let y = 72;
  ctx.fillStyle = "#2f6fed";
  ctx.font = "700 28px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillText("РАСПИСАНИЕ", 72, y);

  y += 52;
  ctx.fillStyle = "#0f1c2e";
  ctx.font = "800 56px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  const titleLines = wrapText(ctx, data.companyName, width - 144);
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, 72, y);
    y += 62;
  }

  y += 8;
  ctx.fillStyle = "#667085";
  ctx.font = "600 30px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillText(data.weekLabel, 72, y);
  y += 48;

  for (const day of data.days) {
    if (day.slots.length === 0) continue;

    drawRoundRect(ctx, 56, y, width - 112, 24 + day.slots.length * 92, 24);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(15,28,46,0.08)";
    ctx.stroke();

    ctx.fillStyle = "#0f1c2e";
    ctx.font = "700 34px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(`${day.dateLabel} · ${day.weekday}`, 80, y + 42);

    let slotY = y + 78;
    for (const slot of day.slots) {
      drawRoundRect(ctx, 80, slotY, width - 160, 72, 16);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.fillStyle = slot.color;
      ctx.fillRect(80, slotY, 8, 72);

      ctx.fillStyle = "#0f1c2e";
      ctx.font = "700 28px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
      ctx.fillText(slot.time, 104, slotY + 30);
      ctx.font="600 26px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
      const titleLinesInner = wrapText(ctx, slot.title, width - 220);
      ctx.fillText(titleLinesInner[0] ?? slot.title, 104, slotY + 58);

      slotY += 84;
    }

    y = slotY + 28;
    if (y > height - 120) break;
  }

  ctx.fillStyle = "#8a97a8";
  ctx.font = "500 24px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillText("CRM Kit", 72, height - 56);

  return canvas;
}

export function renderScheduleHorizontalImage(data: ScheduleExportData): HTMLCanvasElement {
  const width = 1200;
  const height = 630;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas не поддерживается");

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#eef4ff");
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#2f6fed";
  ctx.fillRect(0, 0, width, 6);

  ctx.fillStyle = "#2f6fed";
  ctx.font = "700 18px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillText("РАСПИСАНИЕ", 40, 42);

  ctx.fillStyle = "#0f1c2e";
  ctx.font = "800 34px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillText(data.companyName, 40, 82);

  ctx.fillStyle = "#667085";
  ctx.font = "600 18px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillText(data.weekLabel, 40, 112);

  const colWidth = (width - 80 - 48) / 7;
  const startX = 40;
  const startY = 140;
  const colHeight = height - 170;

  data.days.forEach((day, index) => {
    const x = startX + index * (colWidth + 8);
    drawRoundRect(ctx, x, startY, colWidth, colHeight, 14);
    ctx.fillStyle = index >= 5 ? "#fff8f5" : "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(15,28,46,0.08)";
    ctx.stroke();

    ctx.fillStyle = "#0f1c2e";
    ctx.font = "700 13px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(day.dateLabel, x + 10, startY + 22);
    ctx.fillStyle = "#8a97a8";
    ctx.font = "600 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(day.weekday.slice(0, 2), x + 10, startY + 38);

    let slotY = startY + 52;
    for (const slot of day.slots.slice(0, 4)) {
      const blockHeight = 54;
      if (slotY + blockHeight > startY + colHeight - 8) break;
      drawRoundRect(ctx, x + 8, slotY, colWidth - 16, blockHeight, 10);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.fillStyle = slot.color;
      ctx.fillRect(x + 8, slotY, 4, blockHeight);

      ctx.fillStyle = "#0f1c2e";
      ctx.font = "700 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
      ctx.fillText(slot.time, x + 16, slotY + 16);
      const lines = wrapText(ctx, slot.title, colWidth - 28);
      ctx.font = "600 10px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
      ctx.fillText(lines[0] ?? slot.title, x + 16, slotY + 32);
      if (lines[1]) ctx.fillText(lines[1], x + 16, slotY + 44);
      slotY += blockHeight + 6;
    }
  });

  return canvas;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
