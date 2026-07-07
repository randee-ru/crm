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

type ClientsTableProps = {
  clients: ClientRecord[];
  emptyMessage: string;
};

export function ClientsTable({ clients, emptyMessage }: ClientsTableProps) {
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
            <th className="px-3">
              <span className="inline-flex items-center gap-1.5">
                Контакт
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 opacity-40" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </span>
            </th>
            <th className="px-3">Статус</th>
            <th className="px-3">Абонемент</th>
            <th className="px-3">ДР</th>
            <th className="px-3">Абонемент до</th>
            <th className="px-3">Филиал</th>
            <th className="px-3">Создан</th>
            <th className="px-3">Путь клиента</th>
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
              <td className="px-3 py-3 text-[var(--muted)]">{formatClientDate(client.created_at)}</td>
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
