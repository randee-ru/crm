import type { Metadata } from "next";
import Link from "next/link";

import { CrmModuleHeader } from "@/components/crm-module-header";
import { ModulePageLayout } from "@/components/module-page-layout";
import { TaskForm } from "@/components/task-form";
import { WorkspaceCard } from "@/components/workspace-card";
import { getClients, getCompanyContext } from "@/lib/api";

export const metadata: Metadata = {
  title: "Новая задача",
};

export default async function NewTaskPage() {
  const [, clients] = await Promise.all([getCompanyContext(), getClients()]);

  return (
      <ModulePageLayout>
        <WorkspaceCard className="crm-workspace-card">
          <CrmModuleHeader
            title="Новая задача"
            activeTopTab={0}
            activeViewTab={2}
            showCreate={false}
            actions={
              <Link href="/dashboard/tasks" className="crm-btn-secondary">
                К списку
              </Link>
            }
          />
          <section className="p-4 md:p-6">
            <TaskForm clients={clients} mode="create" />
          </section>
        </WorkspaceCard>
      </ModulePageLayout>
  );
}
