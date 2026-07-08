"use client";

import { IconClose } from "@/components/ui/app-icon";
import { formatDayDate, parseLocalDate } from "@/lib/schedule-week";
import type { PublicScheduleSlotRecord } from "@/lib/types";

type ScheduleEmbedSlotModalProps = {
  slot: PublicScheduleSlotRecord;
  onClose: () => void;
  onBook: (slot: PublicScheduleSlotRecord) => void;
  onCancel: (enrollmentId: number) => void;
  sessionToken: boolean;
  isPending: boolean;
};

function formatTime(value: string): string {
  return value.slice(0, 5);
}

function seatsLabel(seatsLeft: number): string {
  if (seatsLeft <= 0) return "Свободных мест: 0";
  return `Свободных мест: ${seatsLeft}`;
}

function enrollmentStatusLabel(status: string | null): string {
  if (status === "waitlist") return "Вы в листе ожидания";
  if (status === "confirmed") return "Вы записаны на это занятие";
  return "Вы записаны";
}

export function ScheduleEmbedSlotModal({
  slot,
  onClose,
  onBook,
  onCancel,
  sessionToken,
  isPending,
}: ScheduleEmbedSlotModalProps) {
  const dateLabel = formatDayDate(parseLocalDate(slot.session_date));
  const canCancel = Boolean(slot.can_cancel);

  return (
    <div className="schedule-embed-auth-overlay" onClick={onClose} role="presentation">
      <div
        className="schedule-embed-slot-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-slot-modal-title"
      >
        <button type="button" className="schedule-embed-slot-modal-close" onClick={onClose} aria-label="Закрыть">
          <IconClose size={18} />
        </button>

        <div className="schedule-embed-slot-modal-body schedule-embed-slot-modal-body--clean">
          {slot.program_code ? <span className="schedule-embed-slot-modal-kicker">{slot.program_code}</span> : null}
          <h2 id="schedule-slot-modal-title">{slot.display_title}</h2>

          <div className="schedule-embed-slot-modal-facts">
            <span>{seatsLabel(slot.seats_left)}</span>
            <span>
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
            </span>
            {slot.room ? <span>{slot.room}</span> : null}
          </div>

          {slot.is_past ? (
            <p className="schedule-embed-slot-modal-note schedule-embed-slot-modal-note--past">Занятие уже прошло</p>
          ) : slot.is_started ? (
            <p className="schedule-embed-slot-modal-note schedule-embed-slot-modal-note--live">Занятие уже идёт</p>
          ) : !slot.can_book ? (
            <p className="schedule-embed-slot-modal-note schedule-embed-slot-modal-note--closed">Запись закрыта</p>
          ) : slot.is_enrolled ? (
            <p className="schedule-embed-slot-modal-note schedule-embed-slot-modal-note--enrolled">
              {enrollmentStatusLabel(slot.enrollment_status)}
            </p>
          ) : null}

          <dl className="schedule-embed-slot-modal-meta">
            <div>
              <dt>Дата</dt>
              <dd>{dateLabel}</dd>
            </div>
            {slot.trainer_display ? (
              <div>
                <dt>Тренер</dt>
                <dd>{slot.trainer_display}</dd>
              </div>
            ) : null}
            {slot.room ? (
              <div>
                <dt>Зал</dt>
                <dd>{slot.room}</dd>
              </div>
            ) : null}
          </dl>

          <section className="schedule-embed-slot-modal-section">
            <h3>О занятии</h3>
            <p>{slot.description?.trim() || "Описание пока не добавлено. Уточните детали у администратора клуба."}</p>
          </section>

          {slot.restrictions?.trim() ? (
            <section className="schedule-embed-slot-modal-section">
              <h3>Ограничения</h3>
              <p>{slot.restrictions}</p>
            </section>
          ) : null}
        </div>

        {!slot.is_past && slot.can_book && !slot.is_enrolled ? (
          <footer className="schedule-embed-slot-modal-footer">
            <button
              type="button"
              className="schedule-embed-slot-book schedule-embed-slot-book--solo"
              disabled={isPending}
              onClick={() => onBook(slot)}
            >
              {sessionToken ? "Запись на тренировку" : "Войти и записаться"}
            </button>
          </footer>
        ) : canCancel ? (
          <footer className="schedule-embed-slot-modal-footer schedule-embed-slot-modal-footer--split">
            <button type="button" className="schedule-embed-auth-back" onClick={onClose}>
              Закрыть
            </button>
            <button
              type="button"
              className="schedule-embed-slot-cancel"
              disabled={isPending}
              onClick={() => {
                if (slot.enrollment_id) onCancel(slot.enrollment_id);
              }}
            >
              Отменить запись
            </button>
          </footer>
        ) : (
          <footer className="schedule-embed-slot-modal-footer">
            <button type="button" className="schedule-embed-slot-book schedule-embed-slot-book--solo" onClick={onClose}>
              Закрыть
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
