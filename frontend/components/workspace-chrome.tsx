"use client";

import type { ReactNode } from "react";

import { NotificationsPanel } from "@/components/notifications-panel";
import { NotificationsProvider } from "@/components/notifications-provider";
import { Sidebar } from "@/components/sidebar";
import { SiteHeader } from "@/components/site-header";
import { UserPanelProvider } from "@/components/user-panel-provider";
import { UserProfilePanel } from "@/components/user-profile-panel";
import { WorkspaceShellProvider } from "@/components/workspace-shell-provider";
import type { AuthUser, CompanyMembershipRecord, NotificationRecord } from "@/lib/types";

type WorkspaceChromeProps = {
  children: ReactNode;
  user?: AuthUser | null;
  memberships?: CompanyMembershipRecord[];
  companySlug?: string;
  companyName?: string;
  role?: string;
  notifications?: NotificationRecord[];
};

export function WorkspaceChrome({
  children,
  user = null,
  memberships = [],
  companySlug = "",
  companyName,
  role,
  notifications = [],
}: WorkspaceChromeProps) {
  return (
    <WorkspaceShellProvider>
      <NotificationsProvider initialNotifications={notifications}>
        <UserPanelProvider user={user} companyName={companyName} role={role}>
          <div className="workspace-bg flex min-h-screen">
            <Sidebar user={user} />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <SiteHeader
                variant="workspace"
                user={user}
                memberships={memberships}
                companySlug={companySlug}
                companyName={companyName}
              />
              <main className="workspace-stage flex min-h-0 flex-1 flex-col overflow-hidden p-3">
                {children}
              </main>
            </div>
            <NotificationsPanel />
            <UserProfilePanel />
          </div>
        </UserPanelProvider>
      </NotificationsProvider>
    </WorkspaceShellProvider>
  );
}
