"use client";

import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { CompanySwitcher } from "@/components/company-switcher";
import { HeaderClock } from "@/components/header-clock";
import { useNotificationsOptional } from "@/components/notifications-provider";
import { IconBell, IconSearch } from "@/components/ui/app-icon";
import { UserAvatar } from "@/components/user-avatar";
import { useUserPanelOptional } from "@/components/user-panel-provider";
import type { AuthUser, CompanyMembershipRecord } from "@/lib/types";

type SiteHeaderProps = {
  variant?: "workspace" | "marketing";
  user?: AuthUser | null;
  memberships?: CompanyMembershipRecord[];
  companySlug?: string;
  companyName?: string;
};

export function SiteHeader({
  variant = "workspace",
  user = null,
  memberships = [],
  companySlug = "",
  companyName,
}: SiteHeaderProps) {
  const userPanel = useUserPanelOptional();
  const notifications = useNotificationsOptional();
  const isMarketing = variant === "marketing";

  if (isMarketing) {
    return (
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#162a45]/90 text-white backdrop-blur-xl">
        <div className="flex h-[52px] items-center gap-3 px-4">
          <BrandLogo href="/" size="md" onDark className="sm:hidden" />
          <BrandLogo href="/" size="lg" showTitle onDark className="hidden sm:inline-flex" />
          <div className="ml-auto">
            <Link
              href="/login"
              className="flex h-9 items-center justify-center rounded-full bg-white px-4 text-xs font-semibold text-[#1a7fd4]"
            >
              Войти
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="shell-glass-strong z-30 shrink-0">
      <div className="flex h-[var(--header-height)] items-center gap-3 px-4">
        <label className="shell-inset flex min-w-0 max-w-md flex-1 items-center gap-2 rounded-xl px-3 py-2 text-[13px]">
          <IconSearch size={16} className="shrink-0 text-[var(--shell-text-muted)]" />
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
            {companyName?.split(" ")[0] ?? "CRM"}
          </span>
          <input
            type="search"
            placeholder="Поиск по CRM..."
            className="w-full border-0 bg-transparent p-0 text-[var(--shell-text)] outline-none placeholder:text-[var(--shell-text-muted)]"
          />
        </label>

        <div className="header-workspace-actions ml-auto flex items-center gap-2.5">
          <CompanySwitcher
            memberships={memberships}
            currentSlug={companySlug}
            currentName={companyName}
            variant="shell"
          />
          <Link
            href="/dashboard/clients/new"
            className="btn-success btn-success--header hidden md:inline-flex"
          >
            + Создать
          </Link>
          <span className="header-workspace-divider hidden h-6 w-px bg-white/12 md:block" aria-hidden="true" />
          <HeaderClock />
          <button
            type="button"
            onClick={() => {
              userPanel?.closePanel();
              notifications?.togglePanel();
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl shell-inset text-[12px] font-semibold text-[var(--shell-text)] transition hover:bg-white/12"
            aria-label="Уведомления"
            aria-expanded={notifications?.isOpen ?? false}
          >
            <IconBell size={16} />
            {(notifications?.unreadCount ?? 0) > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff453a] text-[9px] font-bold text-white">
                {notifications?.unreadCount}
              </span>
            ) : null}
          </button>
          {user ? (
            <button
              type="button"
              onClick={() => {
                notifications?.closePanel();
                userPanel?.togglePanel();
              }}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white shadow-md shadow-black/15 ring-2 ring-transparent transition hover:ring-[var(--accent)]/50"
              title={user.display_name}
              aria-label="Открыть профиль"
              aria-expanded={userPanel?.isOpen ?? false}
            >
              <UserAvatar
                user={user}
                size="md"
                className="h-full w-full bg-white text-[#1a2332]"
                imageClassName="h-full w-full"
              />
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-white px-3.5 py-2 text-[12px] font-semibold text-[#1a2332] shadow-md"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
