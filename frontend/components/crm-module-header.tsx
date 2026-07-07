import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

import { crmStatusTabs, crmTopTabs, crmViewTabs } from "@/lib/nav";

type CrmViewMode = "kanban" | "list";

type CrmModuleHeaderProps = {
  title: string;
  crmView?: CrmViewMode;
  activeTopTab?: number;
  activeViewTab?: number;
  activeStatusTab?: number | null;
  showTopTabs?: boolean;
  showCreate?: boolean;
  createHref?: ComponentProps<typeof Link>["href"];
  createLabel?: string;
  funnel?: ReactNode;
  toolbar?: ReactNode;
  actions?: ReactNode;
  preserveQuery?: Record<string, string | undefined>;
};

const topTabHrefs = [
  "/dashboard",
  "/dashboard",
  "/dashboard/clients",
  "/dashboard/sales",
  "/dashboard",
  "/dashboard",
  "/dashboard",
] as const;

const viewTabHrefs = [
  "/dashboard",
  "/dashboard/clients",
  "/dashboard/tasks",
  "/dashboard/schedule",
] as const;

function withQuery(href: string, preserveQuery?: Record<string, string | undefined>) {
  if (!preserveQuery) return href;
  const [path, existing = ""] = href.split("?");
  const params = new URLSearchParams(existing);
  for (const [key, value] of Object.entries(preserveQuery)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function CrmModuleHeader({
  title,
  crmView = "kanban",
  activeTopTab = 0,
  activeViewTab,
  activeStatusTab = null,
  showTopTabs = true,
  showCreate = true,
  createHref = "/dashboard/clients/new",
  createLabel = "+ Создать",
  funnel,
  toolbar,
  actions,
  preserveQuery,
}: CrmModuleHeaderProps) {
  return (
    <section className="crm-module-header">
      {showTopTabs ? (
        <div className="crm-module-top-tabs">
          {crmTopTabs.map((tab, index) => {
            const href = withQuery(topTabHrefs[index] ?? "/dashboard", preserveQuery);
            const isActive = index === activeTopTab;

            return isActive ? (
              <span key={tab} className="crm-top-tab crm-top-tab-active">
                {tab}
              </span>
            ) : (
              <Link key={tab} href={href as ComponentProps<typeof Link>["href"]} className="crm-top-tab">
                {tab}
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className="crm-module-title-row">
        <h1 className="crm-module-title">{title}</h1>
        <div className="crm-module-title-actions">
          {actions}
          {showCreate ? (
            <Link href={createHref} className="crm-btn-create">
              {createLabel}
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="crm-module-toolbar">
        <div className="crm-module-toolbar-left">
          {funnel ?? (
            <button type="button" className="crm-funnel-select">
              <span>Общая воронка</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {toolbar}
        </div>
        <button type="button" className="crm-filter-btn" aria-label="Фильтры">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
            <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="crm-module-tabs-row">
        <div className="crm-view-tabs">
          {crmViewTabs.map((tab, index) => {
            const href = withQuery(viewTabHrefs[index] ?? "/dashboard", preserveQuery);
            const isActive =
              activeViewTab !== undefined
                ? index === activeViewTab
                : (crmView === "kanban" && index === 0) || (crmView === "list" && index === 1);

            return isActive ? (
              <span key={tab} className="crm-view-tab crm-view-tab-active">
                {tab}
              </span>
            ) : (
              <Link
                key={tab}
                href={href as ComponentProps<typeof Link>["href"]}
                className="crm-view-tab"
              >
                {tab}
              </Link>
            );
          })}
        </div>
        <div className="crm-status-tabs">
          {crmStatusTabs.map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={`crm-status-tab ${index === activeStatusTab ? "crm-status-tab-active" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="crm-module-tabs-actions">
          <button type="button" className="crm-utility-btn">
            Роботы
          </button>
          <button type="button" className="crm-utility-btn">
            Расширения
          </button>
        </div>
      </div>
    </section>
  );
}
