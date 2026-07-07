"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { MarketingTileIcon } from "@/components/ui/app-icon";
import { connectMarketingIntegrationAction } from "@/app/actions/marketing";
import {
  marketingProviderFields,
  marketingStartSections,
  type MarketingProviderId,
} from "@/lib/nav";
import type { MarketingIntegrationRecord } from "@/lib/types";

type MarketingStartDashboardProps = {
  integrations: MarketingIntegrationRecord[];
  selectedProvider?: string | null;
};

const integrationByProvider = (integrations: MarketingIntegrationRecord[]) =>
  Object.fromEntries(integrations.map((item) => [item.provider, item]));

export function MarketingStartDashboard({ integrations, selectedProvider = null }: MarketingStartDashboardProps) {
  const router = useRouter();
  const [activeProvider, setActiveProvider] = useState<MarketingProviderId | null>(
    (selectedProvider as MarketingProviderId | null) ?? null,
  );
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const connected = useMemo(() => integrationByProvider(integrations), [integrations]);
  const fields = activeProvider ? marketingProviderFields[activeProvider] : [];

  const openProvider = (providerId: MarketingProviderId) => {
    setActiveProvider(providerId);
    setError(null);
    const existing = connected[providerId];
    setSettings(existing?.settings ?? {});
  };

  const handleConnect = () => {
    if (!activeProvider) return;
    setError(null);
    startTransition(async () => {
      const tile = marketingStartSections
        .flatMap((section) => [...section.tiles])
        .find((item) => item.id === activeProvider);
      const result = await connectMarketingIntegrationAction({
        provider: activeProvider,
        title: tile?.label ?? activeProvider,
        settings,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setActiveProvider(null);
      setSettings({});
      router.refresh();
    });
  };

  return (
    <div className="marketing-start-dashboard">
      {marketingStartSections.map((section) => (
        <section key={section.id} className="marketing-start-section">
          <h2 className="marketing-start-section-title">{section.title}</h2>
          <div className="marketing-tile-grid">
            {section.tiles.map((tile) => {
              const integration = connected[tile.id];
              const isConnected = integration?.status === "connected";
              return (
                <button
                  key={tile.id}
                  type="button"
                  className={`marketing-tile marketing-tile--${tile.tone} ${isConnected ? "marketing-tile--connected" : ""}`}
                  onClick={() => openProvider(tile.id)}
                >
                  <span className="marketing-tile-icon">
                    <MarketingTileIcon id={tile.id} size={22} />
                  </span>
                  <span className="marketing-tile-label">{tile.label}</span>
                  {isConnected ? <span className="marketing-tile-badge">Подключено</span> : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {activeProvider ? (
        <div className="marketing-connect-panel">
          <div className="marketing-connect-panel-inner">
            <h3>
              {
                marketingStartSections
                  .flatMap((section) => [...section.tiles])
                  .find((tile) => tile.id === activeProvider)?.label
              }
            </h3>
            <p className="marketing-connect-hint">
              Укажите параметры подключения. Реальная синхронизация с внешними сервисами будет добавлена позже.
            </p>
            {fields.map((field) => (
              <label key={field.key} className="marketing-connect-field">
                <span>{field.label}</span>
                <input
                  type={field.type ?? "text"}
                  value={settings[field.key] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(e) => setSettings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </label>
            ))}
            {error ? <p className="marketing-connect-error">{error}</p> : null}
            <div className="marketing-connect-actions">
              <button type="button" className="btn-secondary" onClick={() => setActiveProvider(null)}>
                Отмена
              </button>
              <button type="button" className="btn-primary" disabled={isPending} onClick={handleConnect}>
                {isPending ? "Подключаем…" : "Подключить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
