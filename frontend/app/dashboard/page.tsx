import type { Metadata } from "next";
import { Suspense } from "react";

import { CrmDashboardWorkspace } from "@/components/crm-dashboard-workspace";
import { ModulePageLayout } from "@/components/module-page-layout";

export const metadata: Metadata = {
  title: "CRM — Воронка",
};

type DashboardPageProps = {
  searchParams: Promise<{
    deal?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;

  return (
    <ModulePageLayout>
      <Suspense fallback={<div className="px-4 py-8 text-[13px] text-[var(--muted)]">Загрузка CRM…</div>}>
        <CrmDashboardWorkspace initialDealId={params.deal ? Number(params.deal) : undefined} />
      </Suspense>
    </ModulePageLayout>
  );
}
