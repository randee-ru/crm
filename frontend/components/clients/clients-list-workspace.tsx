"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ClientsModuleHeader } from "@/components/clients/clients-module-header";
import { ClientsTable } from "@/components/clients-table";
import { ListPagination } from "@/components/list-pagination";
import { WorkspaceCard } from "@/components/workspace-card";
import { listClientsAction } from "@/app/actions/clients";
import type { ClientRecord } from "@/lib/types";

const PAGE_SIZE = 100;
const SEARCH_MIN_LENGTH = 3;

const statusOptions = [
  ["", "Все статусы"],
  ["lead", "Потенциальный"],
  ["active", "Действующий"],
  ["former", "Бывший"],
  ["rejected", "Отказ"],
] as const;

type ClientsListWorkspaceProps = {
  totalCount: number;
  activeCount?: number;
};

export function ClientsListWorkspace({ totalCount, activeCount = 0 }: ClientsListWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const clientStatus = searchParams.get("client_status") || searchParams.get("membership_status") || "";
  const urlSearch = searchParams.get("search") || "";

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [count, setCount] = useState(totalCount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const effectiveSearch = searchInput.trim().length >= SEARCH_MIN_LENGTH ? searchInput.trim() : "";
  const searchPending =
    searchInput.trim().length > 0 && searchInput.trim().length < SEARCH_MIN_LENGTH;

  const updateUrl = useCallback(
    (nextPage: number, nextSearch: string, nextClientStatus: string) => {
      const params = new URLSearchParams();
      if (nextPage > 1) {
        params.set("page", String(nextPage));
      }
      if (nextSearch.length >= SEARCH_MIN_LENGTH) {
        params.set("search", nextSearch);
      }
      if (nextClientStatus) {
        params.set("client_status", nextClientStatus);
      }
      const query = params.toString();
      router.replace(query ? `/dashboard/clients?${query}` : "/dashboard/clients", { scroll: false });
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
        updateUrl(1, nextSearch, clientStatus);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput, clientStatus, urlSearch, updateUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      setLoading(true);
      setError(false);

      try {
        const response = await listClientsAction({
          page,
          search: effectiveSearch || undefined,
          clientStatus: clientStatus || undefined,
        });

        if (!cancelled) {
          setClients(response.results);
          setCount(response.count);
        }
      } catch {
        if (!cancelled) {
          setClients([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadClients();

    return () => {
      cancelled = true;
    };
  }, [page, effectiveSearch, clientStatus]);

  function handleClientStatusChange(value: string) {
    updateUrl(1, effectiveSearch, value);
  }

  function handleReset() {
    setSearchInput("");
    router.replace("/dashboard/clients", { scroll: false });
  }

  const shownFrom = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const shownTo = Math.min(page * PAGE_SIZE, count);

  return (
    <WorkspaceCard className="clients-workspace-card min-w-0 flex-1">
      <ClientsModuleHeader
        shown={clients.length}
        shownFrom={shownFrom}
        shownTo={shownTo}
        total={totalCount}
        activeCount={activeCount}
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-white px-4 py-3">
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[13px] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/15">
          <span className="text-[var(--muted)]">⌕</span>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Имя, телефон, email (от 3 символов)"
            className="w-full border-0 bg-transparent outline-none"
            autoComplete="off"
          />
          {loading ? <span className="text-[12px] text-[var(--muted)]">…</span> : null}
        </label>

        <select
          value={clientStatus}
          onChange={(event) => handleClientStatusChange(event.target.value)}
          className="form-field w-auto min-w-[150px] bg-white"
          aria-label="Статус клиента"
        >
          {statusOptions.map(([value, label]) => (
            <option key={value || "all"} value={value}>
              {label}
            </option>
          ))}
        </select>

        {(urlSearch || clientStatus) && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--panel-muted)]"
          >
            Сбросить
          </button>
        )}
      </div>

      {searchPending ? (
        <p className="clients-search-hint">Введите минимум 3 символа для поиска</p>
      ) : null}

      {!loading && !error && count > 0 ? (
        <p className="clients-page-range">
          Показаны {shownFrom}–{shownTo} из {count}
          {effectiveSearch ? ` по запросу «${effectiveSearch}»` : ""}
        </p>
      ) : null}

      <ClientsTable
        clients={clients}
        emptyMessage={
          error
            ? "Backend недоступен или сессия истекла."
            : searchPending
              ? "Продолжайте ввод — поиск начнётся от 3 символов."
              : "По текущему фильтру клиенты не найдены."
        }
      />

      <ListPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={count}
        disabled={loading}
        onPageChange={(nextPage) => updateUrl(nextPage, effectiveSearch, clientStatus)}
      />
    </WorkspaceCard>
  );
}
