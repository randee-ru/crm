import type { Metadata } from "next";

import { DriveModuleHeader } from "@/components/drive/drive-module-header";
import { DriveWorkspace } from "@/components/drive/drive-workspace";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspaceCard } from "@/components/workspace-card";
import { getDriveBreadcrumb, getDriveItems } from "@/lib/api";

export const metadata: Metadata = {
  title: "Диск",
};

type DrivePageProps = {
  searchParams: Promise<{
    folder?: string;
    trashed?: string;
    search?: string;
  }>;
};

export default async function DrivePage({ searchParams }: DrivePageProps) {
  const params = await searchParams;
  const folderId = params.folder ? Number(params.folder) : null;
  const trashed = params.trashed === "1";
  const search = params.search?.trim() ?? "";

  const items = await getDriveItems(undefined, {
    parent: folderId,
    trashed,
  });

  const filteredItems = search
    ? items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const breadcrumb = folderId
    ? await getDriveBreadcrumb(folderId)
    : [{ id: null, name: "Мой Диск" }];

  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="drive-workspace-card min-w-0 flex-1">
          <DriveModuleHeader activeTab={3} />
          <DriveWorkspace
            items={filteredItems}
            breadcrumb={breadcrumb}
            folderId={folderId}
            trashed={trashed}
            search={search}
          />
        </WorkspaceCard>
      </div>
    </DashboardShell>
  );
}
