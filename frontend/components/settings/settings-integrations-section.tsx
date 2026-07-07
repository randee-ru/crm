"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, useTransition } from "react";

import {
  createIntegrationConnectionAction,
  deleteIntegrationConnectionAction,
  updateIntegrationConnectionAction,
} from "@/app/actions/integrations";
import type {
  IntegrationConnectionRecord,
  IntegrationProvider,
  MarketingIntegrationRecord,
  ScheduleSmsIntegrationRecord,
  TelephonyIntegrationRecord,
} from "@/lib/types";

const OTHER_PROVIDERS: Array<{ id: IntegrationProvider; label: string; description: string }> = [
  { id: "sigur", label: "Sigur", description: "Система контроля доступа: двери, шлагбаумы, пропуска." },
  { id: "rfid", label: "RFID", description: "Браслеты и карты клиентов для прохода и оплаты в клубе." },
  { id: "turnstile", label: "Турникеты", description: "Учёт проходов на входе в клуб." },
  { id: "payment", label: "Платёжный сервис", description: "Приём онлайн-оплат абонементов и услуг." },
  { id: "partner", label: "Партнёрский адаптер", description: "Обмен данными с внешними партнёрскими системами." },
];

type SettingsIntegrationsSectionProps = {
  telephonyIntegration: TelephonyIntegrationRecord | null;
  scheduleSmsIntegrations: ScheduleSmsIntegrationRecord[];
  marketingIntegrations: MarketingIntegrationRecord[];
  initialConnections: IntegrationConnectionRecord[];
};

export function SettingsIntegrationsSection({
  telephonyIntegration,
  scheduleSmsIntegrations,
  marketingIntegrations,
  initialConnections,
}: SettingsIntegrationsSectionProps) {
  const [connections, setConnections] = useState(initialConnections);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newProvider, setNewProvider] = useState<IntegrationProvider>("sigur");
  const [newName, setNewName] = useState("");

  const telephonyConnected = Boolean(telephonyIntegration && telephonyIntegration.provider !== "none");
  const activeSms = scheduleSmsIntegrations.filter((item) => item.is_active).length;
  const activeMarketing = marketingIntegrations.filter((item) => item.status === "connected").length;

  function addConnection() {
    setError(null);
    startTransition(async () => {
      try {
        const created = await createIntegrationConnectionAction({
          provider: newProvider,
          name: newName || OTHER_PROVIDERS.find((item) => item.id === newProvider)?.label || newProvider,
        });
        setConnections((prev) => [...prev, created]);
        setNewName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось подключить интеграцию");
      }
    });
  }

  function toggleActive(connection: IntegrationConnectionRecord) {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await updateIntegrationConnectionAction(connection.id, {
          status: connection.status === "active" ? "draft" : "active",
        });
        setConnections((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось обновить интеграцию");
      }
    });
  }

  function removeConnection(connectionId: number) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteIntegrationConnectionAction(connectionId);
        setConnections((prev) => prev.filter((item) => item.id !== connectionId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось удалить интеграцию");
      }
    });
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>
      ) : null}

      <section className="settings-card p-5">
        <h2 className="settings-card-title">Подключённые сервисы</h2>
        <p className="settings-card-description">
          Эти интеграции уже работают в CRM Kit — настраиваются в своих разделах.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <IntegrationSummaryCard
            title="Телефония"
            provider={telephonyConnected ? telephonyIntegration!.provider : "Mango Office"}
            status={telephonyConnected ? "Подключено" : "Не настроено"}
            tone={telephonyConnected ? "good" : "neutral"}
            href="/dashboard/telephony"
            linkLabel="Открыть телефонию"
          />
          <IntegrationSummaryCard
            title="SMS для расписания"
            provider={`${scheduleSmsIntegrations.length} сервис(ов)`}
            status={activeSms > 0 ? `Активно: ${activeSms}` : "Не настроено"}
            tone={activeSms > 0 ? "good" : "neutral"}
            href="/dashboard/settings?section=schedule"
            linkLabel="Настроить SMS"
          />
          <IntegrationSummaryCard
            title="Маркетинг"
            provider={`${marketingIntegrations.length} сервис(ов)`}
            status={activeMarketing > 0 ? `Подключено: ${activeMarketing}` : "Не настроено"}
            tone={activeMarketing > 0 ? "good" : "neutral"}
            href="/dashboard/marketing"
            linkLabel="Открыть маркетинг"
          />
        </div>
      </section>

      <section className="settings-card p-5">
        <h2 className="settings-card-title">Другие интеграции</h2>
        <p className="settings-card-description">
          СКУД, турникеты, RFID, платёжные сервисы и партнёрские адаптеры. Подключение регистрирует внешний
          сервис в CRM Kit — синхронизация данных настраивается вместе с интегратором.
        </p>

        <div className="settings-schedule-integrations mt-4">
          {connections.length === 0 ? (
            <p className="settings-placeholder-text">Пока нет подключённых интеграций.</p>
          ) : (
            connections.map((connection) => (
              <article key={connection.id} className="settings-schedule-integration">
                <div>
                  <strong>{connection.name}</strong>
                  <span>
                    {connection.provider_label} · {connection.status_label}
                    {connection.last_error ? ` · ${connection.last_error}` : ""}
                  </span>
                </div>
                <div className="settings-schedule-integration-actions">
                  <button
                    type="button"
                    className={`btn-secondary${connection.status === "active" ? " btn-secondary--active" : ""}`}
                    disabled={isPending}
                    onClick={() => toggleActive(connection)}
                  >
                    {connection.status === "active" ? "Активна" : "Включить"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={isPending}
                    onClick={() => removeConnection(connection.id)}
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
            <select
              value={newProvider}
              onChange={(event) => setNewProvider(event.target.value as IntegrationProvider)}
            >
              {OTHER_PROVIDERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-schedule-field">
            Название
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder={OTHER_PROVIDERS.find((item) => item.id === newProvider)?.description}
            />
          </label>
          <button type="button" className="btn-primary" disabled={isPending} onClick={addConnection}>
            Подключить
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {OTHER_PROVIDERS.map((item) => (
            <p key={item.id} className="text-[12px] text-[var(--muted)]">
              <strong className="text-[var(--text)]">{item.label}.</strong> {item.description}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

function IntegrationSummaryCard({
  title,
  provider,
  status,
  tone,
  href,
  linkLabel,
}: {
  title: string;
  provider: string;
  status: string;
  tone: "good" | "neutral";
  href: Route;
  linkLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,28,46,0.04)]">
      <p className="text-[12px] text-[var(--muted)]">{title}</p>
      <p className="mt-1 text-[14px] font-semibold text-[var(--text)]">{provider}</p>
      <p className={`mt-1 text-[12px] font-semibold ${tone === "good" ? "text-[#047857]" : "text-[var(--muted)]"}`}>
        {status}
      </p>
      <Link href={href} className="mt-2 inline-flex text-[12px] font-medium text-[var(--accent-strong)] hover:underline">
        {linkLabel}
      </Link>
    </div>
  );
}
