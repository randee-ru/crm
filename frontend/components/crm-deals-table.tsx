import { formatDealAmount } from "@/lib/crm-kanban";
import type { DealRecord } from "@/lib/types";

type CrmDealsTableProps = {
  deals: DealRecord[];
  emptyMessage: string;
  onDealClick: (dealId: number) => void;
  activeDealId?: number | null;
};

export function CrmDealsTable({ deals, emptyMessage, onDealClick, activeDealId }: CrmDealsTableProps) {
  if (deals.length === 0) {
    return (
      <div className="crm-empty-state">
        <div className="crm-empty-icon">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-10 w-10 fill-none stroke-current stroke-[1.5]">
            <path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            <path d="M9 9h6M9 13h4" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-[13px] text-[var(--muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="crm-deals-table-wrap overflow-x-auto">
      <table className="crm-deals-table w-full min-w-[880px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--line)] text-[12px] text-[var(--muted)]">
            <th className="px-4 py-2.5 font-medium">Сделка / контакт</th>
            <th className="px-3 py-2.5 font-medium">Телефон</th>
            <th className="px-3 py-2.5 font-medium">Этап</th>
            <th className="px-3 py-2.5 font-medium">Сумма</th>
            <th className="px-3 py-2.5 font-medium">Источник</th>
            <th className="px-3 py-2.5 font-medium">Ответственный</th>
            <th className="px-3 py-2.5 font-medium">Создана</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => {
            const isActive = activeDealId === deal.id;
            return (
              <tr
                key={deal.id}
                className={`crm-deals-row border-b border-[var(--line)] transition hover:bg-[var(--panel-muted)] ${
                  isActive ? "bg-[var(--accent)]/5" : ""
                } ${deal.has_overdue_task ? "crm-deals-row--overdue" : ""}`}
              >
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => onDealClick(deal.id)}
                    className="text-left font-medium text-[var(--text)] hover:text-[var(--accent-strong)]"
                  >
                    {deal.client_name || deal.contact_name || deal.title}
                  </button>
                  {deal.client_name && deal.title !== deal.client_name ? (
                    <p className="mt-0.5 text-[12px] text-[var(--muted)]">{deal.title}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-[var(--muted)]">{deal.contact_phone || "—"}</td>
                <td className="px-3 py-2.5">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium"
                    style={{
                      backgroundColor: `${deal.stage_color}22`,
                      color: deal.stage_color,
                    }}
                  >
                    {deal.stage_label}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-medium">{formatDealAmount(deal.amount)}</td>
                <td className="px-3 py-2.5 text-[var(--muted)]">{deal.lead_source_label || "—"}</td>
                <td className="px-3 py-2.5 text-[var(--muted)]">{deal.assigned_to_name || "—"}</td>
                <td className="px-3 py-2.5 text-[var(--muted)]">
                  {new Date(deal.created_at).toLocaleDateString("ru-RU")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
