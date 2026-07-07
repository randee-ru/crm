import type { Metadata } from "next";

import { MailConnectScreen } from "@/components/mail/mail-connect-screen";
import { MailInboxLayout } from "@/components/mail/mail-inbox-layout";
import { MailModuleHeader } from "@/components/mail/mail-module-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspaceCard } from "@/components/workspace-card";
import { getMailAccounts, getMailMessages } from "@/lib/api";

export const metadata: Metadata = {
  title: "Почта",
};

type MailPageProps = {
  searchParams: Promise<{
    folder?: string;
    message?: string;
    search?: string;
  }>;
};

export default async function MailPage({ searchParams }: MailPageProps) {
  const params = await searchParams;
  const accounts = await getMailAccounts();
  const account = accounts[0] ?? null;
  const folder = params.folder ?? "inbox";
  const search = params.search?.trim() ?? "";

  if (!account) {
    return (
      <DashboardShell>
        <div className="workspace-content min-h-0 flex-1">
          <WorkspaceCard className="mail-workspace-card min-w-0 flex-1">
            <MailModuleHeader activeTab={4} />
            <MailConnectScreen />
          </WorkspaceCard>
        </div>
      </DashboardShell>
    );
  }

  const messages = await getMailMessages(account.id, { folder, search });
  const activeMessageId = params.message ? Number(params.message) : (messages[0]?.id ?? null);

  return (
    <DashboardShell>
      <div className="workspace-content min-h-0 flex-1">
        <WorkspaceCard className="mail-workspace-card min-w-0 flex-1">
          <MailModuleHeader activeTab={4} />
          <MailInboxLayout
            account={account}
            messages={messages}
            activeFolder={folder}
            activeMessageId={activeMessageId}
            search={search}
          />
        </WorkspaceCard>
      </div>
    </DashboardShell>
  );
}
