import type { Metadata } from "next";

import { MarketingAdvertisingPanel } from "@/components/marketing/marketing-advertising-panel";
import { MarketingModuleHeader } from "@/components/marketing/marketing-module-header";
import { MarketingNewslettersPanel } from "@/components/marketing/marketing-newsletters-panel";
import { MarketingStartDashboard } from "@/components/marketing/marketing-start-dashboard";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspaceCard } from "@/components/workspace-card";
import { getMarketingCampaigns, getMarketingIntegrations } from "@/lib/api";

export const metadata: Metadata = {
  title: "Маркетинг",
};

type MarketingPageProps = {
  searchParams: Promise<{
    tab?: string;
    connect?: string;
  }>;
};

export default async function MarketingPage({ searchParams }: MarketingPageProps) {
  const params = await searchParams;
  const tab = params.tab ?? "start";
  const [integrations, campaigns] = await Promise.all([
    getMarketingIntegrations(),
    getMarketingCampaigns(),
  ]);

  const activeTab =
    tab === "newsletters"
      ? "newsletters"
      : tab === "advertising"
        ? "advertising"
        : tab === "sales-generator"
          ? "sales-generator"
          : tab === "toloka"
            ? "toloka"
            : "start";

  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="marketing-workspace-card min-w-0 flex-1">
          <MarketingModuleHeader activeTab={activeTab} />
          {activeTab === "newsletters" ? (
            <MarketingNewslettersPanel campaigns={campaigns} integrations={integrations} />
          ) : activeTab === "advertising" ? (
            <MarketingAdvertisingPanel integrations={integrations} variant="advertising" />
          ) : activeTab === "sales-generator" ? (
            <MarketingAdvertisingPanel integrations={integrations} variant="sales-generator" />
          ) : activeTab === "toloka" ? (
            <MarketingAdvertisingPanel integrations={integrations} variant="toloka" />
          ) : (
            <MarketingStartDashboard integrations={integrations} selectedProvider={params.connect} />
          )}
        </WorkspaceCard>
      </div>
    </DashboardShell>
  );
}
