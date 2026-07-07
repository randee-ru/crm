import Link from "next/link";

import { IconCheck, IconFile, IconFileSignature } from "@/components/ui/app-icon";
import type { ContractRecord } from "@/lib/types";

type ContractsTableProps = {
  contracts: ContractRecord[];
  emptyMessage: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatNumber(value: string) {
  const digits = value.replace(/\s/g, "");
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} ${digits.slice(2)}`;
}

export function ContractsTable({ contracts, emptyMessage }: ContractsTableProps) {
  if (contracts.length === 0) {
    return (
      <div className="contracts-empty-state">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="contracts-table-wrap">
      <table className="contracts-table">
        <thead>
          <tr>
            <th className="contracts-table-check">
              <input type="checkbox" aria-label="Выбрать все" disabled />
            </th>
            <th>Представление</th>
            <th>Дата</th>
            <th>Префикс</th>
            <th>Подписан</th>
            <th>Номер</th>
            <th>Структурная единица</th>
            <th>Клиент</th>
            <th>Бланк договора</th>
            <th>Членство, пакет услуг</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <tr key={contract.id} className="contracts-table-row">
              <td className="contracts-table-check">
                <span
                  className={`contracts-doc-icon ${contract.is_signed ? "contracts-doc-icon--signed" : "contracts-doc-icon--draft"}`}
                  aria-hidden="true"
                >
                  {contract.is_signed ? <IconFileSignature size={18} /> : <IconFile size={18} />}
                </span>
              </td>
              <td className="contracts-table-title">{contract.title}</td>
              <td>{formatDate(contract.contract_date)}</td>
              <td>{contract.prefix || "—"}</td>
              <td>
                {contract.is_signed ? (
                  <span className="contracts-signed-badge" title="Подписан">
                    <IconCheck size={12} />
                  </span>
                ) : (
                  <span className="contracts-unsigned">—</span>
                )}
              </td>
              <td className="contracts-table-number">{formatNumber(contract.number)}</td>
              <td>{contract.branch_name ?? "—"}</td>
              <td>
                <Link href={`/dashboard/clients/${contract.client_id}`} className="contracts-client-link">
                  {contract.client_name}
                </Link>
              </td>
              <td className="contracts-table-template">{contract.template_name}</td>
              <td className="contracts-table-membership">{contract.membership_label || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
