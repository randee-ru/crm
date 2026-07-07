import Link from "next/link";

import type { MarketingIntegrationRecord } from "@/lib/types";

type MarketingAdvertisingPanelProps = {
  integrations: MarketingIntegrationRecord[];
  variant: "advertising" | "sales-generator" | "toloka";
};

const providerGroups: Record<
  MarketingAdvertisingPanelProps["variant"],
  { providers: string[]; title: string; description: string }
> = {
  advertising: {
    title: "Реклама",
    description: "Подключите рекламные кабинеты и создавайте аудитории для таргета.",
    providers: ["lookalike", "google_ads", "vk_ads", "yandex_direct"],
  },
  "sales-generator": {
    title: "Генератор продаж",
    description: "Автоматизируйте повторные продажи и возврат клиентов в клуб.",
    providers: ["repeat_deals"],
  },
  toloka: {
    title: "Яндекс.Толока",
    description: "Запускайте краудсорсинговые задачи для маркетинговых исследований.",
    providers: ["yandex_toloka"],
  },
};

export function MarketingAdvertisingPanel({ integrations, variant }: MarketingAdvertisingPanelProps) {
  const group = providerGroups[variant];
  const items = integrations.filter((item) => group.providers.includes(item.provider));

  return (
    <div className="marketing-panel">
      <div className="marketing-panel-toolbar">
        <div>
          <h1>{group.title}</h1>
          <p className="marketing-panel-description">{group.description}</p>
        </div>
        <Link href="/dashboard/marketing" className="btn-secondary">
          К стартовой странице
        </Link>
      </div>

      <div className="marketing-integration-cards">
        {group.providers.map((providerId) => {
          const integration = items.find((item) => item.provider === providerId);
          const isConnected = integration?.status === "connected";
          return (
            <div key={providerId} className={`marketing-integration-card ${isConnected ? "marketing-integration-card--on" : ""}`}>
              <div className="marketing-integration-card-head">
                <strong>{integration?.provider_label ?? providerId}</strong>
                <span className={`marketing-status marketing-status--${integration?.status ?? "disconnected"}`}>
                  {integration?.status_label ?? "Не подключено"}
                </span>
              </div>
              {integration?.last_synced_at ? (
                <p className="marketing-integration-meta">
                  Обновлено: {new Date(integration.last_synced_at).toLocaleString("ru-RU")}
                </p>
              ) : null}
              {integration?.connected_by_name ? (
                <p className="marketing-integration-meta">Подключил: {integration.connected_by_name}</p>
              ) : null}
              <Link
                href={`/dashboard/marketing?connect=${providerId}`}
                className="marketing-integration-link"
              >
                {isConnected ? "Настроить" : "Подключить"}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
