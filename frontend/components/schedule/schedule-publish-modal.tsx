"use client";

import { useMemo, useState, useTransition } from "react";

import { updateScheduleSettingsAction } from "@/app/actions/schedule";
import { IconClose, IconGlobe } from "@/components/ui/app-icon";
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
  const [embedToken, setEmbedToken] = useState(settings.embed_token);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-crm-host";

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({ token: embedToken });
    return `${origin}/embed/schedule/${companySlug}?${params.toString()}`;
  }, [companySlug, embedToken, origin]);

  const mobileUrl = useMemo(() => {
    const params = new URLSearchParams({ token: embedToken });
    return `${origin}/schedule/${companySlug}?${params.toString()}`;
  }, [companySlug, embedToken, origin]);

  const iframeCode = `<iframe src="${embedUrl}" title="Расписание" style="width:100%;min-height:760px;border:0;border-radius:16px;" loading="lazy" allowfullscreen></iframe>`;

  const scriptCode = `<div id="crmkit-schedule"></div>
<script src="${origin}/embed/crmkit-schedule.js" data-company="${companySlug}" data-token="${embedToken}" data-target="crmkit-schedule" async></script>`;

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
        setEmbedToken(updated.embed_token);
        onUpdated(updated);
        setMessage(nextPublished ? "Расписание опубликовано на сайте." : "Публикация отключена.");
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
            <h2>Выложить на сайт</h2>
            <p>Адаптивный виджет для ПК и мобильных. Вставьте код на сайт клуба или откройте прямую ссылку.</p>
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
            <span>Опубликовать расписание на сайте</span>
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
              <strong>Прямая ссылка</strong>
              <button type="button" className="schedule-publish-copy" onClick={() => copyText(embedUrl)}>
                Копировать
              </button>
            </div>
            <code className="schedule-publish-code">{embedUrl}</code>
            <a href={embedUrl} target="_blank" rel="noreferrer" className="schedule-publish-preview">
              <IconGlobe size={14} />
              Открыть превью
            </a>
          </div>

          <div className="schedule-publish-block">
            <div className="schedule-publish-block-head">
              <strong>Ссылка для клиентов (мобильная)</strong>
              <button type="button" className="schedule-publish-copy" onClick={() => copyText(mobileUrl)}>
                Копировать
              </button>
            </div>
            <code className="schedule-publish-code">{mobileUrl}</code>
            <a href={mobileUrl} target="_blank" rel="noreferrer" className="schedule-publish-preview">
              <IconGlobe size={14} />
              Открыть на телефоне
            </a>
          </div>

          <div className="schedule-publish-block">
            <div className="schedule-publish-block-head">
              <strong>Скрипт CRM Kit (рекомендуется)</strong>
              <button type="button" className="schedule-publish-copy" onClick={() => copyText(scriptCode)}>
                Копировать
              </button>
            </div>
            <pre className="schedule-publish-code">{scriptCode}</pre>
          </div>

          <div className="schedule-publish-block">
            <div className="schedule-publish-block-head">
              <strong>Iframe для Tilda / WordPress</strong>
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
