import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MembershipDeleteButton } from "@/components/memberships/membership-delete-button";
import { MembershipForm } from "@/components/memberships/membership-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspaceCard } from "@/components/workspace-card";
import { getBranches, getClients, getMembership } from "@/lib/api";

type MembershipDetailPageProps = {
  params: Promise<{
    membershipId: string;
  }>;
};

const statusLabels: Record<string, string> = {
  draft: "Черновик",
  active: "Активен",
  frozen: "Заморожен",
  expired: "Истёк",
  cancelled: "Отменён",
};

export async function generateMetadata({ params }: MembershipDetailPageProps): Promise<Metadata> {
  const resolved = await params;
  const membershipId = Number(resolved.membershipId);
  if (!Number.isFinite(membershipId)) {
    return { title: "Абонемент" };
  }

  try {
    const membership = await getMembership(membershipId);
    return { title: `Абонемент: ${membership.title}` };
  } catch {
    return { title: "Абонемент" };
  }
}

export default async function MembershipDetailPage({ params }: MembershipDetailPageProps) {
  const resolved = await params;
  const membershipId = Number(resolved.membershipId);

  if (!Number.isFinite(membershipId)) {
    notFound();
  }

  const [membership, clients, branches] = await Promise.all([
    getMembership(membershipId).catch(() => null),
    getClients().catch(() => []),
    getBranches().catch(() => []),
  ]);

  if (!membership) {
    notFound();
  }

  return (
    <DashboardShell>
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
                <h1 className="clients-module-title">{membership.title}</h1>
                <p className="clients-module-subtitle">
                  {membership.client_name} · {statusLabels[membership.status] ?? membership.status}
                  {membership.branch_name ? ` · ${membership.branch_name}` : ""}
                  {membership.remaining_visits !== null ? (
                    <>
                      {" "}
                      · осталось <strong>{membership.remaining_visits}</strong> посещений
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          </header>

          <section className="max-w-2xl p-4 md:p-6">
            <MembershipForm
              membership={membership}
              clients={clients}
              branches={branches}
              submitLabel="Сохранить абонемент"
            />

            <div className="mt-6 border-t border-[var(--line)] pt-4">
              <MembershipDeleteButton membershipId={membership.id} />
            </div>
          </section>
        </WorkspaceCard>
      </div>
    </DashboardShell>
  );
}
