"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { AppIcon, type SectionIconName } from "@/components/ui/app-icon";
import { BrandLogo } from "@/components/brand-logo";
import { UserAvatar } from "@/components/user-avatar";
import { useUserPanelOptional } from "@/components/user-panel-provider";
import { useWorkspaceShell } from "@/components/workspace-shell-provider";
import { workspaceNavigation, workspaceSidebarLayout } from "@/lib/nav";
import type { AuthUser } from "@/lib/types";
import { ChevronDown, Menu } from "lucide-react";

const navById = Object.fromEntries(workspaceNavigation.map((item) => [item.id, item])) as Record<
  (typeof workspaceNavigation)[number]["id"],
  (typeof workspaceNavigation)[number]
>;

function SectionIcon({ name }: { name: SectionIconName }) {
  return <AppIcon name={name} className="shrink-0" size={18} />;
}

function NavIcon({ name }: { name: (typeof workspaceNavigation)[number]["icon"] }) {
  return <AppIcon name={name} className="shrink-0" size={18} />;
}

function MenuIcon() {
  return <Menu className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />;
}

function isActivePath(pathname: string, href: string) {
  const base = href.split("#")[0];
  if (base === "/") return pathname === "/";
  if (base === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function Sidebar({
  user,
  disabledModules = [],
}: {
  user?: AuthUser | null;
  disabledModules?: string[];
}) {
  const pathname = usePathname();
  const userPanel = useUserPanelOptional();
  const { sidebarCollapsed, toggleSidebar, openSections, toggleSection } = useWorkspaceShell();
  const avatarUser = user ?? {
    display_name: "Профиль",
    initials: "ПМ",
    avatar_url: null,
  };

  const isModuleEnabled = (id: string) => id === "settings" || !disabledModules.includes(id);

  const flatItems = useMemo(
    () => workspaceNavigation.filter((item) => isModuleEnabled(item.id)),
    [disabledModules],
  );

  const sidebarLayout = useMemo(
    () =>
      workspaceSidebarLayout
        .map((block) =>
          block.type === "section"
            ? { ...block, items: block.items.filter(isModuleEnabled) }
            : { ...block, items: block.items.filter(isModuleEnabled) },
        )
        .filter((block) => block.items.length > 0),
    [disabledModules],
  );

  return (
    <aside
      data-collapsed={sidebarCollapsed ? "true" : "false"}
      className="sidebar-rail flex h-screen shrink-0 flex-col overflow-hidden text-white transition-[width] duration-200 ease-out"
      style={{
        width: sidebarCollapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)",
      }}
      suppressHydrationWarning
    >
        <div className={`sidebar-header ${sidebarCollapsed ? "sidebar-header-collapsed" : ""}`}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleSidebar();
            }}
            className="sidebar-toggle"
            aria-label={sidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
            aria-expanded={!sidebarCollapsed}
          >
            <MenuIcon />
          </button>
          <BrandLogo
            href="/"
            size={sidebarCollapsed ? "sm" : "md"}
            showTitle={!sidebarCollapsed}
            onDark
            className={sidebarCollapsed ? "" : "min-w-0 flex-1"}
          />
        </div>

        <nav className="sidebar-nav">
          {sidebarCollapsed
            ? flatItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={item.label}
                    className={`sidebar-nav-item px-2 py-2.5 ${active ? "sidebar-nav-item-active" : ""}`}
                  >
                    <NavIcon name={item.icon} />
                  </Link>
                );
              })
            : sidebarLayout.map((block, index) => {
                if (block.type === "section") {
                  const isOpen = openSections[block.id] ?? true;
                  return (
                    <div key={block.id} className="sidebar-section-group">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSection(block.id);
                        }}
                        className="sidebar-section-pill"
                        aria-expanded={isOpen}
                      >
                        <SectionIcon name={block.icon} />
                        <span className="min-w-0 flex-1 truncate">{block.label}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          strokeWidth={2}
                          aria-hidden
                        />
                      </button>
                      {isOpen ? (
                        <div className="mt-1 space-y-0.5">
                          {block.items.map((itemId) => {
                            const item = navById[itemId];
                            const active = isActivePath(pathname, item.href);
                            return (
                              <Link
                                key={item.id}
                                href={item.href}
                                className={`sidebar-nav-item gap-2.5 px-2.5 py-2 ${
                                  active ? "sidebar-nav-item-active" : ""
                                }`}
                              >
                                <NavIcon name={item.icon} />
                                <span className="truncate">{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div
                    key={`items-${index}`}
                    className={`sidebar-standalone-items ${
                      index === sidebarLayout.length - 1 ? "mt-auto" : ""
                    }`}
                  >
                    {block.items.map((itemId) => {
                      const item = navById[itemId];
                      const active = isActivePath(pathname, item.href);
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`sidebar-nav-item gap-3 px-3 py-2.5 ${
                            active ? "sidebar-nav-item-active" : ""
                          }`}
                        >
                          <NavIcon name={item.icon} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            onClick={userPanel?.togglePanel}
            title={sidebarCollapsed ? "Профиль" : undefined}
            className={`sidebar-nav-item ${sidebarCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"}`}
            aria-label="Профиль"
            aria-expanded={userPanel?.isOpen ?? false}
          >
            <UserAvatar
              user={avatarUser}
              size="sm"
              className="bg-white/14 text-white ring-1 ring-white/15"
              imageClassName="ring-1 ring-white/15"
            />
            {!sidebarCollapsed ? <span className="truncate">Профиль</span> : null}
          </button>
        </div>
    </aside>
  );
}
