"use client";

import { useMemo, useState, useTransition } from "react";

import { updateScheduleSettingsAction } from "@/app/actions/schedule";
import { IconClose, IconGlobe } from "@/components/ui/app-icon";
import { schedulePublicOrigin } from "@/lib/public-hosts";
import type { ScheduleSettingsRecord } from "@/lib/types";

type SchedulePublishModalProps = {
  companySlug: string;
  settings: ScheduleSettingsRecord;
  onClose: () => void;
  onUpdated: (settings: ScheduleSettingsRecord) => void;
};

function copyText(value: string) {
  void navigator.clipboard.writeText(value);
}

export function SchedulePublishModal({ companySlug, settings, onClose, onUpdated }: SchedulePublishModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isPublished, setIsPublished] = useState(settings.is_published);
  const [weeksAhead, setWeeksAhead] = useState(String(settings.publish_weeks_ahead || 4));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clientUrl = useMemo(() => `${schedulePublicOrigin()}/`, []);
  const scheduleUrl = useMemo(() => `${schedulePublicOrigin()}/schedule/${companySlug}`, [companySlug]);
  const iframeCode = `<iframe src="${scheduleUrl}" title="Расписание" style="width:100%;min-height:760px;border:0;border-radius:16px;" loading="lazy" allowfullscreen></iframe>`;

  function savePublish(nextPublished = isPublished) {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const updated = await updateScheduleSettingsAction({
          is_published: nextPublished,
          publish_weeks_ahead: Number(weeksAhead) || 4,
        });
        setIsPublished(updated.is_published);
        onUpdated(updated);
        setMessage(nextPublished ? "Расписание опубликовано в личном кабинете." : "Публикация отключена.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить");
      }
    });
  }

  return (
    <div className="schedule-modal-backdrop" onClick={onClose}>
      <div className="schedule-modal schedule-modal--wide schedule-publish-modal" onClick={(event) => event.stopPropagation()}>
        <div className="schedule-publish-hero">
          <div>
            <span className="schedule-embed-badge">Публикация</span>
            <h2>Публичное расписание</h2>
            <p>
              Клиенты открывают расписание на <strong>schedule.sportmax.fit</strong>.
              Личный кабинет — <strong>lk.sportmax.fit</strong>. CRM остаётся только для сотрудников.
            </p>
          </div>
          <button type="button" className="schedule-modal-close schedule-publish-close" onClick={onClose} aria-label="Закрыть">
            <IconClose size={18} />
          </button>
        </div>

        {message ? <div className="settings-schedule-message settings-schedule-message--ok">{message}</div> : null}
        {error ? <div className="settings-schedule-message settings-schedule-message--error">{error}</div> : null}

        <div className="schedule-publish-grid">
          <label className="schedule-publish-toggle">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) => {
                setIsPublished(event.target.checked);
                savePublish(event.target.checked);
              }}
              disabled={isPending}
            />
            <span>Опубликовать расписание для клиентов</span>
          </label>

          <label className="settings-schedule-field">
            Сколько недель показывать
            <input
              type="number"
              min={1}
              max={12}
              value={weeksAhead}
              onChange={(event) => setWeeksAhead(event.target.value)}
              onBlur={() => savePublish()}
              disabled={isPending || !isPublished}
            />
          </label>

          <div className="schedule-publish-block">
            <div className="schedule-publish-block-head">
              <strong>Ссылка для клиентов</strong>
              <button type="button" className="schedule-publish-copy" onClick={() => copyText(clientUrl)}>
                Копировать
              </button>
            </div>
            <code className="schedule-publish-code">{clientUrl}</code>
            <a href={clientUrl} target="_blank" rel="noreferrer" className="schedule-publish-preview">
              <IconGlobe size={14} />
              Открыть расписание
            </a>
          </div>

          <div className="schedule-publish-block">
            <div className="schedule-publish-block-head">
              <strong>Прямая ссылка на расписание</strong>
              <button type="button" className="schedule-publish-copy" onClick={() => copyText(scheduleUrl)}>
                Копировать
              </button>
            </div>
            <code className="schedule-publish-code">{scheduleUrl}</code>
          </div>

          <div className="schedule-publish-block">
            <div className="schedule-publish-block-head">
              <strong>Iframe для сайта клуба</strong>
              <button type="button" className="schedule-publish-copy" onClick={() => copyText(iframeCode)}>
                Копировать
              </button>
            </div>
            <pre className="schedule-publish-code">{iframeCode}</pre>
          </div>
        </div>

        <div className="schedule-modal-actions">
          <button type="button" className="schedule-modal-save" disabled={isPending} onClick={() => savePublish()}>
            Сохранить настройки публикации
          </button>
        </div>
      </div>
    </div>
  );
}
