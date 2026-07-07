import type { Metadata } from "next";
import Link from "next/link";

import { DashboardShell } from "@/components/dashboard-shell";
import { TrainerForm } from "@/components/trainers/trainer-form";
import { WorkspaceCard } from "@/components/workspace-card";
import { getBranches } from "@/lib/api";
import type { BranchOption } from "@/lib/types";

export const metadata: Metadata = { title: "Новый тренер" };

export default async function NewTrainerPage() {
  const branches = await getBranches().catch(() => [] as BranchOption[]);

  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="trainers-workspace-card min-w-0 flex-1">
          <header className="clients-module-header">
            <div className="clients-module-header-main">
              <div>
                <Link
                  href="/dashboard/trainers"
                  className="mb-2 inline-flex text-[12px] font-medium text-[var(--muted)] hover:text-[var(--accent-strong)]"
                >
                  ← К списку тренеров
                </Link>
                <h1 className="clients-module-title">Новый тренер</h1>
                <p className="clients-module-subtitle">
                  Заполните контакты и специализацию — тренер сразу появится в расписании и бронированиях.
                </p>
              </div>
            </div>
          </header>

          <section className="max-w-2xl p-4 md:p-6">
            <TrainerForm branches={branches} />
          </section>
        </WorkspaceCard>
      </div>
    </DashboardShell>
  );
}
