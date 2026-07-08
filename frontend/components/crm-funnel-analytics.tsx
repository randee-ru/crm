"use client";

import { useEffect, useState, useTransition } from "react";

import { getCrmFunnelAnalyticsAction } from "@/app/actions/deals";
import type { CrmAnalyticsSummary, FunnelAnalytics } from "@/lib/types";

type CrmFunnelAnalyticsProps = {
  summary: CrmAnalyticsSummary | null;
  pipelineSlug: string;
  title: string;
};

export function CrmFunnelAnalytics({ summary, pipelineSlug, title }: CrmFunnelAnalyticsProps) {
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState<FunnelAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!expanded || analytics || !pipelineSlug) return;

    startTransition(async () => {
      setLoading(true);
      try {
        const data = await getCrmFunnelAnalyticsAction(pipelineSlug);
        setAnalytics(data);
      } catch {
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    });
  }, [analytics, expanded, pipelineSlug]);

  if (!summary) return null;

  const rate =
    analytics?.conversion_rate ??
    analytics?.renewal_rate ??
    (summary.total_deals > 0
      ? Math.round(((summary.total_deals - summary.open_deals) / summary.total_deals) * 1000) / 10
      : 0);

  return (
    <section className={`crm-funnel-analytics${expanded ? " crm-funnel-analytics--expanded" : ""}`} aria-label={title}>
      <button
        type="button"
        className="crm-funnel-analytics-toggle"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="crm-funnel-analytics-toggle-label">
          Статистика
          <svg
            className={`crm-funnel-analytics-chevron${expanded ? " crm-funnel-analytics-chevron--open" : ""}`}
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <span className="crm-funnel-analytics-summary">
          <span>{summary.total_deals} сделок</span>
          <span>{summary.open_deals} в работе</span>
          <span>{rate}% конверсия</span>
        </span>
      </button>

      {expanded ? (
        <div className="crm-funnel-analytics-body">
          {loading || isPending ? (
            <p className="crm-funnel-analytics-loading">Загрузка деталей…</p>
          ) : null}
          {analytics ? (
            <div className="crm-funnel-analytics-stages">
              {analytics.stages.map((stage) => (
                <div key={stage.code} className="crm-funnel-analytics-stage">
                  <span className="crm-funnel-analytics-stage-name">{stage.name}</span>
                  <span className="crm-funnel-analytics-stage-count">{stage.count}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
