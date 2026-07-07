import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

import { tasksTopTabs, tasksViewTabs } from "@/lib/nav";

type TasksModuleHeaderProps = {
  title?: string;
  activeTopTab?: number;
  activeViewTab?: number;
  createHref?: ComponentProps<typeof Link>["href"];
  createLabel?: string;
  filters?: ReactNode;
  preserveQuery?: Record<string, string | undefined>;
};

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

export function TasksModuleHeader({
  title = "Мои задачи",
  activeTopTab = 0,
  activeViewTab = 0,
  createHref = "/dashboard/tasks/new",
  createLabel = "+ Создать",
  filters,
  preserveQuery,
}: TasksModuleHeaderProps) {
  return (
    <section className="crm-module-header tasks-module-header">
      <div className="crm-module-top-tabs">
        {tasksTopTabs.map((tab, index) => {
          const isActive = index === activeTopTab;

          return isActive ? (
            <span key={tab} className="crm-top-tab crm-top-tab-active">
              {tab}
            </span>
          ) : (
            <span key={tab} className="crm-top-tab tasks-top-tab-stub" aria-disabled="true">
              {tab}
            </span>
          );
        })}
      </div>

      <div className="crm-module-title-row">
        <h1 className="crm-module-title">{title}</h1>
        <div className="crm-module-title-actions">
          <Link href={createHref} className="tasks-btn-create">
            {createLabel}
          </Link>
        </div>
      </div>

      {filters}

      <div className="crm-module-tabs-row">
        <div className="crm-view-tabs">
          {tasksViewTabs.map((tab, index) => {
            const href = withQuery(tab.href, preserveQuery);
            const isStub = index === 1 || index === 2 || index === 4;
            const isActive = index === activeViewTab;

            if (isStub) {
              return (
                <span key={tab.label} className="crm-view-tab tasks-view-tab-stub" aria-disabled="true">
                  {tab.label}
                </span>
              );
            }

            return isActive ? (
              <span key={tab.label} className="crm-view-tab crm-view-tab-active">
                {tab.label}
              </span>
            ) : (
              <Link
                key={tab.label}
                href={href as ComponentProps<typeof Link>["href"]}
                className="crm-view-tab"
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <div className="crm-module-tabs-actions">
          <button type="button" className="crm-utility-btn tasks-utility-btn-stub">
            Чаты задач
          </button>
          <button type="button" className="crm-utility-btn tasks-utility-btn-stub">
            Прочитать все
          </button>
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
