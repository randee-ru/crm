import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CrmModuleHeader } from "@/components/crm-module-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { ModulePageLayout } from "@/components/module-page-layout";
import { ProfileForm } from "@/components/profile-form";
import { WorkspaceCard } from "@/components/workspace-card";
import { getAuthSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Личные данные" };

export default async function ProfilePage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  return (
    <DashboardShell>
      <ModulePageLayout>
        <WorkspaceCard className="crm-workspace-card">
          <CrmModuleHeader
            title="Личные данные"
            showTopTabs={false}
            showCreate={false}
            funnel={
              <button type="button" className="crm-funnel-select" disabled>
                <span>Профиль</span>
              </button>
            }
          />
          <ProfileForm
            key={`${session.user.id}-${session.user.display_name}-${session.user.avatar_url ?? ""}`}
            user={session.user}
            role={session.company?.role}
            companyName={session.company?.name}
          />
        </WorkspaceCard>
      </ModulePageLayout>
    </DashboardShell>
  );
}
