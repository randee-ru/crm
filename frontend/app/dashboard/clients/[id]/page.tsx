import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientProfilePanel } from "@/components/clients/client-profile-panel";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspaceCard } from "@/components/workspace-card";
import { getBranches, getClient, getClientProfile } from "@/lib/api";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ClientDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const client = await getClient(Number(id));
    return { title: client.full_name };
  } catch {
    return { title: "Клиент" };
  }
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const clientId = Number(id);

  if (Number.isNaN(clientId)) {
    notFound();
  }

  let client;
  let profile;
  let branches;

  try {
    [client, profile, branches] = await Promise.all([
      getClient(clientId),
      getClientProfile(clientId),
      getBranches(),
    ]);
  } catch {
    notFound();
  }

  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="clients-workspace-card min-w-0 flex-1">
          <ClientProfilePanel profile={profile} client={client} branches={branches} />
        </WorkspaceCard>
      </div>
    </DashboardShell>
  );
}
