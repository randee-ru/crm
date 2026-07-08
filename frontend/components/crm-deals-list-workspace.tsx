"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { listDealsAction } from "@/app/actions/deals";
import { CrmDealCardPanel } from "@/components/crm-deal-card-panel";
import { CrmDealsTable } from "@/components/crm-deals-table";
import { ListPagination } from "@/components/list-pagination";
import type { BranchOption, DealPipelineRecord, DealRecord } from "@/lib/types";

const PAGE_SIZE = 100;
const SEARCH_MIN_LENGTH = 2;

type CrmDealsListWorkspaceProps = {
  pipelines: DealPipelineRecord[];
  activePipelineId: number;
  branches: BranchOption[];
  initialDealId?: number;
};

export function CrmDealsListWorkspace({
  pipelines,
  activePipelineId,
  branches,
  initialDealId,
}: CrmDealsListWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const urlSearch = searchParams.get("search") || "";
  const pipelineId = searchParams.get("pipeline") || String(activePipelineId);
  const stageId = searchParams.get("stage") || "";

  const activePipeline = useMemo(
    () => pipelines.find((pipeline) => String(pipeline.id) === pipelineId) ?? pipelines[0],
    [pipelineId, pipelines],
  );

  const stages = activePipeline?.stages ?? [];

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openDealId, setOpenDealId] = useState<number | null>(initialDealId ?? null);

  const effectiveSearch = searchInput.trim().length >= SEARCH_MIN_LENGTH ? searchInput.trim() : "";
  const searchPending = searchInput.trim().length > 0 && searchInput.trim().length < SEARCH_MIN_LENGTH;

  const updateUrl = useCallback(
    (nextPage: number, nextSearch: string, nextPipelineId: string, nextStageId: string) => {
      const params = new URLSearchParams({ view: "list" });
      if (nextPipelineId) params.set("pipeline", nextPipelineId);
      if (nextStageId) params.set("stage", nextStageId);
      if (nextPage > 1) params.set("page", String(nextPage));
      if (nextSearch.length >= SEARCH_MIN_LENGTH) params.set("search", nextSearch);
      router.replace(`/dashboard?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      const nextSearch = trimmed.length >= SEARCH_MIN_LENGTH ? trimmed : "";
      if (nextSearch !== urlSearch) {
        updateUrl(1, nextSearch, pipelineId, stageId);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput, pipelineId, stageId, urlSearch, updateUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadDeals() {
      setLoading(true);
      setError(false);

      try {
        const response = await listDealsAction({
          page,
          search: effectiveSearch || undefined,
          pipelineId: pipelineId || undefined,
          stageId: stageId || undefined,
        });

        if (!cancelled) {
          setDeals(response.results);
          setCount(response.count);
        }
      } catch {
        if (!cancelled) {
          setDeals([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDeals();

    return () => {
      cancelled = true;
    };
  }, [page, effectiveSearch, pipelineId, stageId]);

  const shownFrom = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const shownTo = Math.min(page * PAGE_SIZE, count);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-white px-4 py-3">
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[13px] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/15">
          <span className="text-[var(--muted)]">⌕</span>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Сделка, имя, телефон (от 2 символов)"
            className="w-full border-0 bg-transparent outline-none"
            autoComplete="off"
          />
          {loading ? <span className="text-[12px] text-[var(--muted)]">…</span> : null}
        </label>

        <select
          value={stageId}
          onChange={(event) => updateUrl(1, effectiveSearch, pipelineId, event.target.value)}
          className="form-field w-auto min-w-[180px] bg-white"
          aria-label="Этап воронки"
        >
          <option value="">Все этапы</option>
          {stages.map((stage) => (
            <option key={stage.id} value={String(stage.id)}>
              {stage.name}
            </option>
          ))}
        </select>

        {(urlSearch || stageId) && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              updateUrl(1, "", pipelineId, "");
            }}
            className="inline-flex items-center rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--panel-muted)]"
          >
            Сбросить
          </button>
        )}
      </div>

      {searchPending ? (
        <p className="px-4 py-2 text-[12px] text-[var(--muted)]">Введите минимум 2 символа для поиска</p>
      ) : null}

      {!loading && !error && count > 0 ? (
        <p className="clients-page-range">
          Показаны {shownFrom}–{shownTo} из {count}
          {effectiveSearch ? ` по запросу «${effectiveSearch}»` : ""}
        </p>
      ) : null}

      <CrmDealsTable
        deals={deals}
        activeDealId={openDealId}
        onDealClick={setOpenDealId}
        emptyMessage={
          error
            ? "Backend недоступен или сессия истекла."
            : searchPending
              ? "Продолжайте ввод — поиск начнётся от 2 символов."
              : "По текущему фильтру сделки не найдены."
        }
      />

      <ListPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={count}
        disabled={loading}
        onPageChange={(nextPage) => updateUrl(nextPage, effectiveSearch, pipelineId, stageId)}
      />

      {openDealId && activePipeline ? (
        <CrmDealCardPanel
          dealId={openDealId}
          pipeline={activePipeline}
          pipelines={pipelines}
          branches={branches}
          onClose={() => setOpenDealId(null)}
        />
      ) : null}
    </>
  );
}
