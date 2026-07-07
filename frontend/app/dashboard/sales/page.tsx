import type { Metadata } from "next";

import { FitnessModulePage } from "@/components/fitness-module-page";
import { WidgetCard } from "@/components/widget-card";
import { formatMoney, getCompanyContext, getSales, saleStatusLabels } from "@/lib/api";

export const metadata: Metadata = { title: "Продажи" };

function statusClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-[#e8f7d4] text-[#5e7a1f]";
    case "pending":
      return "bg-[#fff2d9] text-[#8a5a00]";
    case "cancelled":
      return "bg-[#ffe9e8] text-[#b42318]";
    default:
      return "bg-[#f3f4f6] text-[#6b7280]";
  }
}

export default async function SalesPage() {
  const [company, sales] = await Promise.all([getCompanyContext(), getSales()]);
  const totalRevenue = sales.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0);

  return (
    <FitnessModulePage
      title="Продажи"
      description="Продажи абонементов и дополнительных услуг. Здесь удобно видеть сумму сделки, скидку и фактическую оплату."
      showCreate={false}
      sidebar={
        <WidgetCard title="Сводка" className="bg-white">
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Компания</span>
              <span className="font-semibold text-[var(--text)]">{company.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Продаж</span>
              <span className="font-semibold text-[var(--text)]">{sales.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Выручка</span>
              <span className="font-semibold text-[var(--text)]">{formatMoney(totalRevenue)}</span>
            </div>
          </div>
        </WidgetCard>
      }
    >
      <div className="overflow-x-auto bg-white">
        <table className="min-w-full text-left text-[13px]">
          <thead className="border-b border-[var(--line)] bg-[var(--panel-muted)] text-[12px] uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Продажа</th>
              <th className="px-4 py-3 font-medium">Клиент</th>
              <th className="px-4 py-3 font-medium">Тренер</th>
              <th className="px-4 py-3 font-medium">Сумма</th>
              <th className="px-4 py-3 font-medium">Оплачено</th>
              <th className="px-4 py-3 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {sales.length > 0 ? (
              sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-[#f8fbfe]">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[var(--text)]">{sale.title}</div>
                    <div className="text-[12px] text-[var(--muted)]">{sale.branch_name || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{sale.client_name || "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{sale.trainer_name || "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatMoney(sale.total_amount)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatMoney(sale.paid_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(sale.status)}`}>
                      {saleStatusLabels[sale.status] ?? sale.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-[13px] text-[var(--muted)]" colSpan={6}>
                  Продаж пока нет. Запустите `seed_demo`.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </FitnessModulePage>
  );
}
