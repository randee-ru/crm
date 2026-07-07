import type { Metadata } from "next";

import { FitnessModulePage } from "@/components/fitness-module-page";
import { WidgetCard } from "@/components/widget-card";
import {
  formatDateTime,
  formatMoney,
  getCompanyContext,
  getPayments,
  paymentMethodLabels,
  paymentStatusLabels,
} from "@/lib/api";

export const metadata: Metadata = { title: "Платежи" };

function statusClass(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-[#e8f7d4] text-[#5e7a1f]";
    case "pending":
      return "bg-[#fff2d9] text-[#8a5a00]";
    case "failed":
    case "refunded":
      return "bg-[#ffe9e8] text-[#b42318]";
    default:
      return "bg-[#f3f4f6] text-[#6b7280]";
  }
}

export default async function PaymentsPage() {
  const [company, payments] = await Promise.all([getCompanyContext(), getPayments()]);
  const received = payments
    .filter((item) => item.status === "succeeded")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <FitnessModulePage
      title="Платежи"
      description="Оплаты по продажам и абонементам. Здесь видно сумму, канал оплаты и связь с продажей."
      showCreate={false}
      sidebar={
        <WidgetCard title="Сводка" className="bg-white">
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Компания</span>
              <span className="font-semibold text-[var(--text)]">{company.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Платежей</span>
              <span className="font-semibold text-[var(--text)]">{payments.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Получено</span>
              <span className="font-semibold text-[var(--text)]">{formatMoney(received)}</span>
            </div>
          </div>
        </WidgetCard>
      }
    >
      <div className="overflow-x-auto bg-white">
        <table className="min-w-full text-left text-[13px]">
          <thead className="border-b border-[var(--line)] bg-[var(--panel-muted)] text-[12px] uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Платёж</th>
              <th className="px-4 py-3 font-medium">Клиент</th>
              <th className="px-4 py-3 font-medium">Продажа</th>
              <th className="px-4 py-3 font-medium">Сумма</th>
              <th className="px-4 py-3 font-medium">Способ</th>
              <th className="px-4 py-3 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {payments.length > 0 ? (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-[#f8fbfe]">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[var(--text)]">
                      {formatDateTime(payment.paid_at)}
                    </div>
                    <div className="text-[12px] text-[var(--muted)]">{payment.branch_name || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{payment.client_name || "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{payment.sale_title || "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatMoney(payment.amount)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {paymentMethodLabels[payment.method] ?? payment.method}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(payment.status)}`}>
                      {paymentStatusLabels[payment.status] ?? payment.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-[13px] text-[var(--muted)]" colSpan={6}>
                  Платежей пока нет. Запустите `seed_demo`.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </FitnessModulePage>
  );
}
