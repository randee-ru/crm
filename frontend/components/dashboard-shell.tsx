import type { ReactNode } from "react";

import { WorkspaceChrome } from "@/components/workspace-chrome";
import { getAuthSession, getCompanySlugFromCookie } from "@/lib/auth";
import { getNotifications } from "@/lib/api";

type DashboardShellProps = {
  children: ReactNode;
};

export async function DashboardShell({ children }: DashboardShellProps) {
  const session = await getAuthSession();
  const companySlug = await getCompanySlugFromCookie();
  const notifications = session ? await getNotifications(companySlug).catch(() => []) : [];

  return (
    <WorkspaceChrome
      user={session?.user}
      memberships={session?.memberships ?? []}
      companySlug={companySlug}
      companyName={session?.company?.name}
      role={session?.company?.role}
      notifications={notifications}
      disabledModules={session?.company?.disabled_modules ?? []}
    >
      {children}
    </WorkspaceChrome>
  );
}
