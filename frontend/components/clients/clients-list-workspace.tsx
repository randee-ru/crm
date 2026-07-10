"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ClientsModuleHeader } from "@/components/clients/clients-module-header";
import { ClientsTable, type ClientSortKey } from "@/components/clients-table";
import { ListPagination } from "@/components/list-pagination";
import { WorkspaceCard } from "@/components/workspace-card";
import { listClientsAction } from "@/app/actions/clients";
import type { ClientRecord } from "@/lib/types";

const PAGE_SIZE = 100;
const SEARCH_MIN_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 800;

const statusOptions = [
  ["", "Все статусы"],
  ["lead", "Потенциальный"],
  ["active", "Действующий"],
  ["former", "Бывший"],
  ["rejected", "Отказ"],
] as const;

const birthdayMonthOptions = [
  ["", "Месяц ДР"],
  ["1", "Январь"],
  ["2", "Февраль"],
  ["3", "Март"],
  ["4", "Апрель"],
  ["5", "Май"],
  ["6", "Июнь"],
  ["7", "Июль"],
  ["8", "Август"],
  ["9", "Сентябрь"],
  ["10", "Октябрь"],
  ["11", "Ноябрь"],
  ["12", "Декабрь"],
] as const;

const expiryOptions = [
  ["", "Абонемент"],
  ["7", "7 дней"],
  ["14", "14 дней"],
  ["30", "30 дней"],
  ["60", "60 дней"],
  ["90", "90 дней"],
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
  const birthDateFrom = searchParams.get("birth_date_from") || "";
  const birthDateTo = searchParams.get("birth_date_to") || "";
  const birthdayMonth = searchParams.get("birthday_month") || "";
  const membershipExpiresInDays = searchParams.get("membership_expires_in_days") || "";
  const ordering = searchParams.get("ordering") || "";

  const hasAdvancedFilters = Boolean(
    birthDateFrom || birthDateTo || birthdayMonth || membershipExpiresInDays,
  );

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [count, setCount] = useState(totalCount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(hasAdvancedFilters);

  const effectiveSearch = searchInput.trim().length >= SEARCH_MIN_LENGTH ? searchInput.trim() : "";
  const searchPending =
    searchInput.trim().length > 0 && searchInput.trim().length < SEARCH_MIN_LENGTH;

  const updateUrl = useCallback(
    (
      nextPage: number,
      nextSearch: string,
      nextClientStatus: string,
      nextBirthDateFrom: string,
      nextBirthDateTo: string,
      nextBirthdayMonth: string,
      nextMembershipExpiresInDays: string,
      nextOrdering: string,
    ) => {
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
      if (nextBirthDateFrom) {
        params.set("birth_date_from", nextBirthDateFrom);
      }
      if (nextBirthDateTo) {
        params.set("birth_date_to", nextBirthDateTo);
      }
      if (nextBirthdayMonth) {
        params.set("birthday_month", nextBirthdayMonth);
      }
      if (nextMembershipExpiresInDays) {
        params.set("membership_expires_in_days", nextMembershipExpiresInDays);
      }
      if (nextOrdering) {
        params.set("ordering", nextOrdering);
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
        updateUrl(
          1,
          nextSearch,
          clientStatus,
          birthDateFrom,
          birthDateTo,
          birthdayMonth,
          membershipExpiresInDays,
          ordering,
        );
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    searchInput,
    clientStatus,
    urlSearch,
    updateUrl,
    birthDateFrom,
    birthDateTo,
    birthdayMonth,
    membershipExpiresInDays,
    ordering,
  ]);

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
          birthDateFrom: birthDateFrom || undefined,
          birthDateTo: birthDateTo || undefined,
          birthdayMonth: birthdayMonth || undefined,
          membershipExpiresInDays: membershipExpiresInDays || undefined,
          ordering: ordering || undefined,
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
  }, [page, effectiveSearch, clientStatus, birthDateFrom, birthDateTo, birthdayMonth, membershipExpiresInDays, ordering]);

  function handleClientStatusChange(value: string) {
    updateUrl(1, effectiveSearch, value, birthDateFrom, birthDateTo, birthdayMonth, membershipExpiresInDays, ordering);
  }

  function handleFilterChange(nextValues: {
    birthDateFrom?: string;
    birthDateTo?: string;
    birthdayMonth?: string;
    membershipExpiresInDays?: string;
  }) {
    updateUrl(
      1,
      effectiveSearch,
      clientStatus,
      nextValues.birthDateFrom ?? birthDateFrom,
      nextValues.birthDateTo ?? birthDateTo,
      nextValues.birthdayMonth ?? birthdayMonth,
      nextValues.membershipExpiresInDays ?? membershipExpiresInDays,
      ordering,
    );
  }

  function handleSortChange(key: ClientSortKey) {
    let nextOrdering: string = key;
    if (ordering === key) {
      nextOrdering = `-${key}`;
    } else if (ordering === `-${key}`) {
      nextOrdering = "";
    }
    updateUrl(
      1,
      effectiveSearch,
      clientStatus,
      birthDateFrom,
      birthDateTo,
      birthdayMonth,
      membershipExpiresInDays,
      nextOrdering,
    );
  }

  function handleReset() {
    setSearchInput("");
    setShowAdvanced(false);
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

        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-medium transition ${
            showAdvanced || hasAdvancedFilters
              ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent-strong)]"
              : "border-[var(--line)] bg-white text-[var(--text)] hover:bg-[var(--panel-muted)]"
          }`}
          aria-expanded={showAdvanced}
        >
          Ещё фильтры
          {hasAdvancedFilters ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-white">
              {[birthDateFrom, birthDateTo, birthdayMonth, membershipExpiresInDays].filter(Boolean).length}
            </span>
          ) : (
            <span aria-hidden="true">{showAdvanced ? "▲" : "▼"}</span>
          )}
        </button>

        {(urlSearch || clientStatus || hasAdvancedFilters || ordering) && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--panel-muted)]"
          >
            Сбросить всё
          </button>
        )}
      </div>

      {showAdvanced ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[13px]">
            <span className="text-[var(--muted)]">Дата рождения от</span>
            <input
              type="date"
              value={birthDateFrom}
              onChange={(event) => handleFilterChange({ birthDateFrom: event.target.value })}
              className="w-[140px] border-0 bg-transparent p-0 outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[13px]">
            <span className="text-[var(--muted)]">до</span>
            <input
              type="date"
              value={birthDateTo}
              onChange={(event) => handleFilterChange({ birthDateTo: event.target.value })}
              className="w-[140px] border-0 bg-transparent p-0 outline-none"
            />
          </label>

          <select
            value={birthdayMonth}
            onChange={(event) => handleFilterChange({ birthdayMonth: event.target.value })}
            className="form-field w-auto min-w-[140px] bg-white"
            aria-label="Месяц рождения"
          >
            {birthdayMonthOptions.map(([value, label]) => (
              <option key={value || "all-birthday-month"} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={membershipExpiresInDays}
            onChange={(event) => handleFilterChange({ membershipExpiresInDays: event.target.value })}
            className="form-field w-auto min-w-[220px] bg-white"
            aria-label="Срок окончания абонемента"
          >
            {expiryOptions.map(([value, label]) => (
              <option key={value || "all-expiry"} value={value}>
                {value === "" ? label : `Абонемент истекает через ${label}`}
              </option>
            ))}
          </select>

          {hasAdvancedFilters ? (
            <button
              type="button"
              onClick={() =>
                handleFilterChange({
                  birthDateFrom: "",
                  birthDateTo: "",
                  birthdayMonth: "",
                  membershipExpiresInDays: "",
                })
              }
              className="text-[13px] font-medium text-[var(--muted)] hover:text-[var(--text)]"
            >
              Очистить эти фильтры
            </button>
          ) : null}
        </div>
      ) : null}

      {searchPending ? (
        <p className="clients-search-hint">Введите минимум 3 символа и подождите паузу перед поиском</p>
      ) : null}

      {!loading && !error && count > 0 ? (
        <p className="clients-page-range">
          Показаны {shownFrom}–{shownTo} из {count}
          {effectiveSearch ? ` по запросу «${effectiveSearch}»` : ""}
        </p>
      ) : null}

      <ClientsTable
        clients={clients}
        ordering={ordering}
        onSortChange={handleSortChange}
        emptyMessage={
          error
            ? "Backend недоступен или сессия истекла."
            : searchPending
              ? "Продолжайте ввод — поиск начнётся после паузы."
              : "По текущему фильтру клиенты не найдены."
        }
      />

      <ListPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={count}
        disabled={loading}
        onPageChange={(nextPage) =>
          updateUrl(
            nextPage,
            effectiveSearch,
            clientStatus,
            birthDateFrom,
            birthDateTo,
            birthdayMonth,
            membershipExpiresInDays,
            ordering,
          )
        }
      />
    </WorkspaceCard>
  );
}
