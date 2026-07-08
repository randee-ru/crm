import type { Metadata } from "next";
import Link from "next/link";

import { MembershipForm } from "@/components/memberships/membership-form";
import { WorkspaceCard } from "@/components/workspace-card";
import { getBranches, getClients, getCompanyContext } from "@/lib/api";

export const metadata: Metadata = { title: "Новый абонемент" };

export default async function NewMembershipPage() {
  const [company, clients, branches] = await Promise.all([
    getCompanyContext().catch(() => null),
    getClients().catch(() => []),
    getBranches().catch(() => []),
  ]);

  return (
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="clients-workspace-card min-w-0 flex-1">
          <header className="clients-module-header">
            <div className="clients-module-header-main">
              <div>
                <Link
                  href="/dashboard/memberships"
                  className="mb-2 inline-flex text-[12px] font-medium text-[var(--muted)] hover:text-[var(--accent-strong)]"
                >
                  ← К списку
                </Link>
                <h1 className="clients-module-title">Новый абонемент</h1>
                <p className="clients-module-subtitle">
                  Компания: <strong>{company?.name ?? "Компания"}</strong>
                </p>
              </div>
            </div>
          </header>

          <section className="max-w-2xl p-4 md:p-6">
            <MembershipForm clients={clients} branches={branches} />
          </section>
        </WorkspaceCard>
      </div>
  );
}
