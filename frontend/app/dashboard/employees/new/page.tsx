import type { Metadata } from "next";
import Link from "next/link";

import { DashboardShell } from "@/components/dashboard-shell";
import { EmployeeCreateForm } from "@/components/employees/employee-create-form";
import { WorkspaceCard } from "@/components/workspace-card";
import { getEmployeesDashboard } from "@/lib/api";
import type { BranchOption } from "@/lib/types";

export const metadata: Metadata = { title: "Новый сотрудник" };

export default async function NewEmployeePage() {
  const branches = await getEmployeesDashboard()
    .then((dashboard) => dashboard.branches)
    .catch(() => [] as BranchOption[]);

  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="clients-workspace-card min-w-0 flex-1">
          <header className="clients-module-header">
            <div className="clients-module-header-main">
              <div>
                <Link
                  href="/dashboard/employees"
                  className="mb-2 inline-flex text-[12px] font-medium text-[var(--muted)] hover:text-[var(--accent-strong)]"
                >
                  ← К списку сотрудников
                </Link>
                <h1 className="clients-module-title">Новый сотрудник</h1>
                <p className="clients-module-subtitle">
                  Пригласите по email или создайте доступ сразу, с паролем.
                </p>
              </div>
            </div>
          </header>

          <section className="max-w-xl p-4 md:p-6">
            <EmployeeCreateForm branches={branches} />
          </section>
        </WorkspaceCard>
      </div>
    </DashboardShell>
  );
}
