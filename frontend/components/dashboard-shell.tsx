import type { ReactNode } from "react";

import { WorkspaceChrome } from "@/components/workspace-chrome";
import { getAuthSession, getCompanySlugFromCookie } from "@/lib/auth";

type DashboardShellProps = {
  children: ReactNode;
};

export async function DashboardShell({ children }: DashboardShellProps) {
  const [session, companySlug] = await Promise.all([getAuthSession(), getCompanySlugFromCookie()]);

  return (
    <WorkspaceChrome
      user={session?.user}
      memberships={session?.memberships ?? []}
      companySlug={companySlug}
      companyName={session?.company?.name}
      role={session?.company?.role}
      disabledModules={session?.company?.disabled_modules ?? []}
    >
      {children}
    </WorkspaceChrome>
  );
}
