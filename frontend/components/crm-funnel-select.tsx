"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";

import { buildCrmDashboardHref } from "@/lib/crm-kanban";
import { CANONICAL_PIPELINE_SLUGS, sortCanonicalPipelines } from "@/lib/crm-pipelines";
import type { DealPipelineRecord } from "@/lib/types";

type CrmFunnelSelectProps = {
  pipelines: DealPipelineRecord[];
  activePipelineId: number;
  preserveQuery?: Record<string, string | undefined>;
};

function withQuery(
  href: string,
  preserveQuery?: Record<string, string | undefined>,
  skipKeys: string[] = [],
) {
  const [path, existing = ""] = href.split("?");
  const params = new URLSearchParams(existing);
  const skip = new Set(skipKeys);
  if (preserveQuery) {
    for (const [key, value] of Object.entries(preserveQuery)) {
      if (value && !skip.has(key)) {
        params.set(key, value);
      }
    }
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function CrmFunnelSelect({
  pipelines,
  activePipelineId,
  preserveQuery,
}: CrmFunnelSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activePipeline =
    pipelines.find((pipeline) => pipeline.id === activePipelineId) ?? pipelines[0];
  const visiblePipelines = sortCanonicalPipelines(
    pipelines.filter((pipeline) =>
      (CANONICAL_PIPELINE_SLUGS as readonly string[]).includes(pipeline.slug),
    ),
  );

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!activePipeline) {
    return (
      <button type="button" className="crm-funnel-select" disabled>
        <span>Нет воронок</span>
      </button>
    );
  }

  return (
    <div className="crm-funnel-select-wrap" ref={rootRef}>
      <button
        type="button"
        className="crm-funnel-select"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{activePipeline.name}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="crm-funnel-dropdown" role="menu">
          {visiblePipelines.map((pipeline) => (
            <Link
              key={pipeline.id}
              href={
                withQuery(
                  buildCrmDashboardHref(preserveQuery?.view === "list" ? "list" : "kanban", {
                    pipeline: String(pipeline.id),
                  }),
                  preserveQuery,
                  ["pipeline"],
                ) as ComponentProps<typeof Link>["href"]
              }
              className={`crm-funnel-option ${
                pipeline.id === activePipeline.id ? "crm-funnel-option--active" : ""
              }`}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span>{pipeline.name}</span>
              {pipeline.is_default ? <span className="crm-funnel-badge">по умолчанию</span> : null}
            </Link>
          ))}
          <Link
            href="/dashboard/settings?section=pipelines"
            className="crm-funnel-option crm-funnel-option--settings"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Настроить воронки
          </Link>
        </div>
      ) : null}
    </div>
  );
}
