"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createScheduleSmsIntegrationAction,
  deleteScheduleSmsIntegrationAction,
  updateScheduleSettingsAction,
  updateScheduleSmsIntegrationAction,
} from "@/app/actions/schedule";
import type { ScheduleSettingsRecord, ScheduleSmsIntegrationRecord } from "@/lib/types";

const SMS_PROVIDERS = [
  { id: "sms_ru", label: "SMS.ru" },
  { id: "smsc", label: "SMSC.ru" },
  { id: "sms_aero", label: "SMS Aero" },
  { id: "twilio", label: "Twilio" },
  { id: "webhook", label: "Webhook" },
] as const;

type SettingsScheduleSectionProps = {
  initialSettings: ScheduleSettingsRecord;
  initialIntegrations: ScheduleSmsIntegrationRecord[];
};

export function SettingsScheduleSection({
  initialSettings,
  initialIntegrations,
}: SettingsScheduleSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [maxParticipants, setMaxParticipants] = useState(String(initialSettings.default_max_participants));
  const [remind24h, setRemind24h] = useState(initialSettings.sms_reminder_hours.includes(24));
  const [remind2h, setRemind2h] = useState(initialSettings.sms_reminder_hours.includes(2));
  const [customHours, setCustomHours] = useState(
    initialSettings.sms_reminder_hours.filter((item) => item !== 24 && item !== 2).join(", "),
  );

  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [newProvider, setNewProvider] = useState("sms_ru");
  const [newTitle, setNewTitle] = useState("");
  const [newSender, setNewSender] = useState("");
  const [newApiKey, setNewApiKey] = useState("");

  function buildReminderHours(): number[] {
    const hours: number[] = [];
    if (remind24h) hours.push(24);
    if (remind2h) hours.push(2);
    for (const part of customHours.split(/[,\s;]+/)) {
      const value = Number(part.trim());
      if (value > 0 && value <= 168 && !hours.includes(value)) {
        hours.push(value);
      }
    }
    return hours.sort((a, b) => b - a);
  }

  function saveSettings() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await updateScheduleSettingsAction({
          default_max_participants: Number(maxParticipants) || 20,
          sms_reminder_hours: buildReminderHours(),
        });
        setMessage("Настройки расписания сохранены.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить настройки");
      }
    });
  }

  function addIntegration() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const created = await createScheduleSmsIntegrationAction({
          provider: newProvider,
          title: newTitle || SMS_PROVIDERS.find((item) => item.id === newProvider)?.label || "SMS",
          sender_name: newSender,
          api_key: newApiKey,
          is_active: true,
          is_primary: integrations.length === 0,
        });
        setIntegrations((prev) => [...prev, created]);
        setNewTitle("");
        setNewSender("");
        setNewApiKey("");
        setMessage("SMS-сервис подключён.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось подключить SMS-сервис");
      }
    });
  }

  function toggleIntegration(integration: ScheduleSmsIntegrationRecord, field: "is_active" | "is_primary") {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await updateScheduleSmsIntegrationAction(integration.id, {
          [field]: !integration[field],
        });
        setIntegrations((prev) =>
          prev.map((item) => {
            if (item.id === updated.id) return updated;
            if (field === "is_primary" && updated.is_primary) {
              return { ...item, is_primary: false };
            }
            return item;
          }),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось обновить интеграцию");
      }
    });
  }

  function removeIntegration(integrationId: number) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteScheduleSmsIntegrationAction(integrationId);
        setIntegrations((prev) => prev.filter((item) => item.id !== integrationId));
        setMessage("SMS-сервис удалён.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось удалить интеграцию");
      }
    });
  }

  return (
    <div className="settings-schedule">
      {message ? <div className="settings-schedule-message settings-schedule-message--ok">{message}</div> : null}
      {error ? <div className="settings-schedule-message settings-schedule-message--error">{error}</div> : null}

      <section className="settings-card">
        <h2 className="settings-card-title">Занятия и лимиты</h2>
        <p className="settings-card-description">
          Сколько человек может записаться на одно групповое занятие по умолчанию. Для отдельных слотов лимит можно
          переопределить в карточке занятия.
        </p>
        <label className="settings-schedule-field">
          Макс. участников по умолчанию
          <input
            type="number"
            min={1}
            max={200}
            value={maxParticipants}
            onChange={(event) => setMaxParticipants(event.target.value)}
          />
        </label>
        <button type="button" className="btn-primary" disabled={isPending} onClick={saveSettings}>
          Сохранить лимиты
        </button>
      </section>

      <section className="settings-card">
        <h2 className="settings-card-title">SMS-напоминания</h2>
        <p className="settings-card-description">
          Когда отправлять клиентам SMS перед началом группового занятия. Напоминания работают после подключения
          SMS-сервиса ниже.
        </p>
        <div className="settings-schedule-checks">
          <label>
            <input type="checkbox" checked={remind24h} onChange={(event) => setRemind24h(event.target.checked)} />
            За 24 часа до начала
          </label>
          <label>
            <input type="checkbox" checked={remind2h} onChange={(event) => setRemind2h(event.target.checked)} />
            За 2 часа до начала
          </label>
        </div>
        <label className="settings-schedule-field">
          Дополнительные интервалы (часы, через запятую)
          <input
            value={customHours}
            onChange={(event) => setCustomHours(event.target.value)}
            placeholder="Например: 12, 1"
          />
        </label>
        <button type="button" className="btn-primary" disabled={isPending} onClick={saveSettings}>
          Сохранить настройки
        </button>
      </section>

      <section className="settings-card">
        <h2 className="settings-card-title">SMS-сервисы</h2>
        <p className="settings-card-description">
          Подключите провайдера для отправки SMS-напоминаний о групповых занятиях.
        </p>

        <div className="settings-schedule-integrations">
          {integrations.length === 0 ? (
            <p className="settings-placeholder-text">Пока нет подключённых SMS-сервисов.</p>
          ) : (
            integrations.map((integration) => (
              <article key={integration.id} className="settings-schedule-integration">
                <div>
                  <strong>{integration.title || integration.provider}</strong>
                  <span>
                    {integration.sender_name || "без отправителя"}
                    {integration.has_api_key ? " · ключ сохранён" : " · ключ не задан"}
                  </span>
                </div>
                <div className="settings-schedule-integration-actions">
                  <button
                    type="button"
                    className={`btn-secondary${integration.is_primary ? " btn-secondary--active" : ""}`}
                    disabled={isPending}
                    onClick={() => toggleIntegration(integration, "is_primary")}
                  >
                    {integration.is_primary ? "Основной" : "Сделать основным"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={isPending}
                    onClick={() => toggleIntegration(integration, "is_active")}
                  >
                    {integration.is_active ? "Активен" : "Выключен"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={isPending}
                    onClick={() => removeIntegration(integration.id)}
                  >
                    Удалить
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="settings-schedule-new-integration">
          <label className="settings-schedule-field">
            Провайдер
            <select value={newProvider} onChange={(event) => setNewProvider(event.target.value)}>
              {SMS_PROVIDERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-schedule-field">
            Название
            <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Например: SMS.ru Sportmax" />
          </label>
          <label className="settings-schedule-field">
            Имя отправителя
            <input value={newSender} onChange={(event) => setNewSender(event.target.value)} placeholder="SPORTMAX" />
          </label>
          <label className="settings-schedule-field">
            API Key
            <input value={newApiKey} onChange={(event) => setNewApiKey(event.target.value)} placeholder="Ключ API провайдера" />
          </label>
          <button type="button" className="btn-primary" disabled={isPending || !newApiKey.trim()} onClick={addIntegration}>
            Подключить SMS-сервис
          </button>
        </div>
      </section>
    </div>
  );
}
