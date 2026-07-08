/** Коды этапов и воронки по схеме фитнес-клуба. */

export const GENERAL_PIPELINE_SLUG = "general";
export const SALES_PIPELINE_SLUG = "membership-sales";
export const RENEWAL_PIPELINE_SLUG = "membership-renewal";
export const WINBACK_PIPELINE_SLUG = "customer-winback";

export const CANONICAL_PIPELINE_SLUGS = [
  GENERAL_PIPELINE_SLUG,
  SALES_PIPELINE_SLUG,
  RENEWAL_PIPELINE_SLUG,
  WINBACK_PIPELINE_SLUG,
] as const;

export const SALES_STAGE_CODES = [
  "new_lead",
  "visit_scheduled",
  "visit_done",
  "follow_up",
  "contract",
  "won",
  "lost",
] as const;

export const RENEWAL_STAGE_CODES = [
  "renewal_30",
  "renewal_15",
  "renewal_7",
  "renewal_3",
  "renewal_today",
  "renewal_overdue",
  "renewal_won",
  "renewal_lost",
] as const;

export const WINBACK_STAGE_CODES = [
  "winback_new",
  "winback_contact",
  "winback_offer",
  "winback_won",
  "winback_lost",
] as const;

export const PIPELINE_LABELS: Record<string, string> = {
  [GENERAL_PIPELINE_SLUG]: "Общая воронка",
  [SALES_PIPELINE_SLUG]: "Продажа абонемента",
  [RENEWAL_PIPELINE_SLUG]: "Продление абонемента",
  [WINBACK_PIPELINE_SLUG]: "Возврат клиентов",
};

export function filterCanonicalStages<T extends { code: string }>(
  pipelineSlug: string,
  stages: T[],
): T[] {
  const allowed =
    pipelineSlug === GENERAL_PIPELINE_SLUG || pipelineSlug === SALES_PIPELINE_SLUG
      ? new Set<string>(SALES_STAGE_CODES)
      : pipelineSlug === RENEWAL_PIPELINE_SLUG
        ? new Set<string>(RENEWAL_STAGE_CODES)
        : pipelineSlug === WINBACK_PIPELINE_SLUG
          ? new Set<string>(WINBACK_STAGE_CODES)
          : null;

  if (!allowed) {
    return stages;
  }

  return stages.filter((stage) => allowed.has(stage.code));
}

export function sortCanonicalPipelines<T extends { slug: string; sort_order: number; id: number }>(
  pipelines: T[],
): T[] {
  const order = new Map(CANONICAL_PIPELINE_SLUGS.map((slug, index) => [slug, index]));
  return [...pipelines].sort((a, b) => {
    const aOrder = order.get(a.slug) ?? 100 + a.sort_order;
    const bOrder = order.get(b.slug) ?? 100 + b.sort_order;
    return aOrder - bOrder || a.id - b.id;
  });
}
