"use client";

import { useEffect, useMemo, useState } from "react";

import { IconClose } from "@/components/ui/app-icon";
import {
  buildScheduleExportData,
  downloadCanvas,
  renderScheduleHorizontalImage,
  renderScheduleStoryImage,
  type ScheduleExportData,
} from "@/lib/schedule-export";
import type { GroupScheduleSlotRecord } from "@/lib/types";

type ScheduleSocialModalProps = {
  companyName: string;
  weekStart: Date;
  slots: GroupScheduleSlotRecord[];
  onClose: () => void;
};

export function ScheduleSocialModal({ companyName, weekStart, slots, onClose }: ScheduleSocialModalProps) {
  const exportData = useMemo(
    () => buildScheduleExportData(companyName, weekStart, slots),
    [companyName, weekStart, slots],
  );

  const [storyPreview, setStoryPreview] = useState("");
  const [horizontalPreview, setHorizontalPreview] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const storyCanvas = renderScheduleStoryImage(exportData);
      const horizontalCanvas = renderScheduleHorizontalImage(exportData);
      setStoryPreview(storyCanvas.toDataURL("image/png"));
      setHorizontalPreview(horizontalCanvas.toDataURL("image/png"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сгенерировать изображения");
    }
  }, [exportData]);

  function handleDownloadStory() {
    try {
      const canvas = renderScheduleStoryImage(exportData);
      downloadCanvas(canvas, `schedule-story-${exportData.weekLabel.replace(/\s+/g, "-")}.png`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось скачать Stories");
    }
  }

  function handleDownloadHorizontal() {
    try {
      const canvas = renderScheduleHorizontalImage(exportData);
      downloadCanvas(canvas, `schedule-social-${exportData.weekLabel.replace(/\s+/g, "-")}.png`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось скачать горизонтальную картинку");
    }
  }

  return (
    <div className="schedule-modal-backdrop" onClick={onClose}>
      <div className="schedule-modal schedule-modal--wide schedule-social-modal" onClick={(event) => event.stopPropagation()}>
        <div className="schedule-publish-hero">
          <div>
            <span className="schedule-embed-badge">Соцсети</span>
            <h2>Картинки для публикации</h2>
            <p>
              Вертикальная — Stories. Горизонтальная — Telegram, VK, Instagram. Неделя: {exportData.weekLabel}
            </p>
          </div>
          <button type="button" className="schedule-modal-close schedule-publish-close" onClick={onClose} aria-label="Закрыть">
            <IconClose size={18} />
          </button>
        </div>

        {error ? <div className="settings-schedule-message settings-schedule-message--error">{error}</div> : null}

        <div className="schedule-social-grid">
          <article className="schedule-social-card">
            <header>
              <strong>Stories · 1080×1920</strong>
              <button type="button" className="schedule-publish-copy" onClick={handleDownloadStory}>
                Скачать PNG
              </button>
            </header>
            <div className="schedule-social-preview schedule-social-preview--story">
              {storyPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={storyPreview} alt="Расписание для Stories" />
              ) : (
                <p>Генерация…</p>
              )}
            </div>
          </article>

          <article className="schedule-social-card">
            <header>
              <strong>Telegram / VK / Instagram · 1200×630</strong>
              <button type="button" className="schedule-publish-copy" onClick={handleDownloadHorizontal}>
                Скачать PNG
              </button>
            </header>
            <div className="schedule-social-preview schedule-social-preview--horizontal">
              {horizontalPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={horizontalPreview} alt="Расписание для соцсетей" />
              ) : (
                <p>Генерация…</p>
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
