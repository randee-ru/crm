import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { CrmModuleHeader } from "@/components/crm-module-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { ModulePageLayout } from "@/components/module-page-layout";
import { WorkspaceCard } from "@/components/workspace-card";

type FitnessModulePageProps = {
  title: string;
  description: string;
  children: ReactNode;
  sidebar?: ReactNode;
  actions?: ReactNode;
  createHref?: ComponentProps<typeof Link>["href"];
  createLabel?: string;
  showCreate?: boolean;
};

export function FitnessModulePage({
  title,
  description,
  children,
  sidebar,
  actions,
  createHref,
  createLabel,
  showCreate = true,
}: FitnessModulePageProps) {
  return (
    <DashboardShell>
      <ModulePageLayout sidebar={sidebar}>
        <WorkspaceCard className="crm-workspace-card min-w-0 flex-1">
          <CrmModuleHeader
            title={title}
            showTopTabs={false}
            showCreate={showCreate}
            createHref={createHref}
            createLabel={createLabel}
            actions={actions}
          />
          <div className="border-t border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
            <p className="max-w-3xl text-[13px] leading-6 text-[var(--muted)]">{description}</p>
          </div>
          {children}
        </WorkspaceCard>
      </ModulePageLayout>
    </DashboardShell>
  );
}
