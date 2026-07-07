import type { Metadata } from "next";
import Link from "next/link";

import { CrmModuleHeader } from "@/components/crm-module-header";
import { ClientForm } from "@/components/client-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { ModulePageLayout } from "@/components/module-page-layout";
import { WorkspaceCard } from "@/components/workspace-card";
import { getAuthSession } from "@/lib/auth";
import { getBranches, getCompanyContext } from "@/lib/api";

export const metadata: Metadata = {
  title: "Новый клиент",
};

export default async function NewClientPage() {
  const [company, branches] = await Promise.all([getCompanyContext(), getBranches()]);
  const session = await getAuthSession();
  const canManageBlocks = ["owner", "admin", "manager"].includes(session?.company?.role ?? "");

  return (
    <DashboardShell>
      <ModulePageLayout>
        <WorkspaceCard className="crm-workspace-card">
          <CrmModuleHeader
            title="Новый клиент"
            activeTopTab={2}
            showCreate={false}
            actions={
              <Link href="/dashboard" className="crm-btn-secondary">
                Назад к списку
              </Link>
            }
          />
          <section className="p-4 md:p-6">
            <p className="mb-4 text-[13px] text-[var(--muted)]">
              Клиент будет создан в компании{" "}
              <span className="font-medium text-[var(--text)]">{company.name}</span>.
            </p>
            <ClientForm branches={branches} mode="create" canManageBlocks={canManageBlocks} />
          </section>
        </WorkspaceCard>
      </ModulePageLayout>
    </DashboardShell>
  );
}
