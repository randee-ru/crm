import Link from "next/link";

import { StatusBadge, membershipStatusTone } from "@/components/status-badge";
import type { ClientRecord } from "@/lib/types";
import {
  clientStatusLabels,
  formatClientDate,
  getClientInitials,
  getClientPathLabel,
  getMembershipDealLabel,
  membershipStatusLabels,
} from "@/lib/api";

export type ClientSortKey =
  | "name"
  | "client_status"
  | "membership_title"
  | "birth_date"
  | "membership_end"
  | "branch"
  | "registration_date"
  | "path";

type ClientsTableProps = {
  clients: ClientRecord[];
  emptyMessage: string;
  ordering?: string;
  onSortChange?: (key: ClientSortKey) => void;
};

function SortableHeader({
  label,
  sortKey,
  ordering,
  onSortChange,
}: {
  label: string;
  sortKey: ClientSortKey;
  ordering?: string;
  onSortChange?: (key: ClientSortKey) => void;
}) {
  const isDescending = ordering === `-${sortKey}`;
  const isActive = ordering === sortKey || isDescending;

  return (
    <th className="px-3">
      <button
        type="button"
        onClick={() => onSortChange?.(sortKey)}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap font-medium transition hover:text-[var(--accent-strong)] ${
          isActive ? "text-[var(--accent-strong)]" : "text-[var(--text)]"
        }`}
      >
        {label}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${isActive ? "opacity-100" : "opacity-40"} ${
            isDescending ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </th>
  );
}

export function ClientsTable({ clients, emptyMessage, ordering, onSortChange }: ClientsTableProps) {
  if (clients.length === 0) {
    return (
      <div className="crm-empty-state">
        <div className="crm-empty-icon">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-10 w-10 fill-none stroke-current stroke-[1.5]">
            <path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            <path d="M9 9h6M9 13h4" strokeLinecap="round" />
            <path d="m15 17-2-2-2 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-[15px] font-medium text-[var(--text)]">Нет данных</p>
        <p className="mt-1 max-w-sm text-[13px] text-[var(--muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-[13px]">
        <thead className="crm-table-head">
          <tr>
            <th className="w-10 px-4">
              <span className="inline-block h-4 w-4 rounded border border-[var(--line-strong)] bg-white" />
            </th>
            <SortableHeader label="Контакт" sortKey="name" ordering={ordering} onSortChange={onSortChange} />
            <SortableHeader label="Статус" sortKey="client_status" ordering={ordering} onSortChange={onSortChange} />
            <SortableHeader
              label="Абонемент"
              sortKey="membership_title"
              ordering={ordering}
              onSortChange={onSortChange}
            />
            <SortableHeader label="День рождения" sortKey="birth_date" ordering={ordering} onSortChange={onSortChange} />
            <SortableHeader
              label="Абонемент до"
              sortKey="membership_end"
              ordering={ordering}
              onSortChange={onSortChange}
            />
            <SortableHeader label="Филиал" sortKey="branch" ordering={ordering} onSortChange={onSortChange} />
            <SortableHeader
              label="Создан"
              sortKey="registration_date"
              ordering={ordering}
              onSortChange={onSortChange}
            />
            <SortableHeader label="Путь клиента" sortKey="path" ordering={ordering} onSortChange={onSortChange} />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {clients.map((client) => (
            <tr key={client.id} className="group transition hover:bg-[#f8fbfd]">
              <td className="px-4 py-3">
                <span className="inline-block h-4 w-4 rounded border border-[var(--line-strong)] bg-white" />
              </td>
              <td className="px-3 py-3">
                <Link href={`/dashboard/clients/${client.id}`} className="flex min-w-[200px] items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dfe8ef] to-[#cfd8e0] text-[11px] font-bold text-[#5a6a78] ring-1 ring-white">
                    {getClientInitials(client.full_name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[var(--text)] group-hover:text-[var(--link)]">
                      {client.full_name}
                    </span>
                    <span className="block truncate text-[12px] text-[var(--muted)]">{client.phone}</span>
                    {client.club_access_blocked || client.group_programs_blocked ? (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {client.club_access_blocked ? <span className="crm-chip crm-chip--danger">Блок входа</span> : null}
                        {client.group_programs_blocked ? <span className="crm-chip crm-chip--danger">Блок групп</span> : null}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </td>
              <td className="px-3 py-3">
                {client.client_status ? (
                  <StatusBadge
                    label={client.client_status_label || clientStatusLabels[client.client_status] || client.client_status}
                    tone={client.client_status === "active" ? "success" : client.client_status === "lead" ? "info" : "neutral"}
                  />
                ) : (
                  <span className="text-[var(--muted)]">—</span>
                )}
              </td>
              <td className="px-3 py-3">
                {client.membership_status ? (
                  <StatusBadge
                    label={membershipStatusLabels[client.membership_status] ?? client.membership_status}
                    tone={membershipStatusTone(client.membership_status)}
                  />
                ) : (
                  <span className="text-[var(--muted)]">{getMembershipDealLabel(client)}</span>
                )}
              </td>
              <td className="px-3 py-3 text-[var(--muted)]">
                {client.birth_date ? formatClientDate(client.birth_date) : "—"}
              </td>
              <td className="px-3 py-3 text-[var(--muted)]">
                {client.membership_end ? formatClientDate(client.membership_end) : "—"}
              </td>
              <td className="px-3 py-3 text-[var(--text)]">{client.branch_name ?? "—"}</td>
              <td className="px-3 py-3 text-[var(--muted)]">{formatClientDate(client.registration_date)}</td>
              <td className="max-w-[200px] truncate px-3 py-3 text-[var(--muted)]">
                {getClientPathLabel(client)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
