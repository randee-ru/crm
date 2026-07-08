import type { ReactNode } from "react";

import { CrmModuleHeader } from "@/components/crm-module-header";
import { ModulePageLayout } from "@/components/module-page-layout";
import { WorkspaceCard } from "@/components/workspace-card";

type PlaceholderModulePageProps = {
  title: string;
  description: string;
  activeTopTab?: number;
  children?: ReactNode;
};

export async function PlaceholderModulePage({
  title,
  description,
  activeTopTab = 3,
  children,
}: PlaceholderModulePageProps) {
  return (
    <ModulePageLayout>
      <WorkspaceCard className="crm-workspace-card">
        <CrmModuleHeader
          title={title}
          activeTopTab={activeTopTab}
          showCreate={false}
        />
        <div className="px-4 py-8">
          <p className="max-w-2xl text-[14px] leading-6 text-[var(--muted)]">{description}</p>
          {children}
        </div>
      </WorkspaceCard>
    </ModulePageLayout>
  );
}
