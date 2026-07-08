"use client";

import { useState, useTransition } from "react";

import { createClientQuickAction } from "@/app/actions/clients";
import type { BranchOption, ClientRecord } from "@/lib/types";

type CrmDealCreateClientProps = {
  phone: string;
  branches: BranchOption[];
  branchId?: number | null;
  disabled?: boolean;
  onCreated: (client: ClientRecord) => void;
};

export function CrmDealCreateClient({
  phone,
  branches,
  branchId,
  disabled,
  onCreated,
}: CrmDealCreateClientProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const branchRaw = String(formData.get("branch_id") ?? "").trim();

    startTransition(async () => {
      setError(null);
      const result = await createClientQuickAction({
        last_name: String(formData.get("last_name") ?? "").trim(),
        first_name: String(formData.get("first_name") ?? "").trim(),
        middle_name: String(formData.get("middle_name") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim(),
        birth_date: null,
        notes: "",
        branch_id: branchRaw ? Number(branchRaw) : branchId ?? null,
        is_active: true,
        club_access_blocked: false,
        group_programs_blocked: false,
      });

      if (result.error || !result.client) {
        setError(result.error ?? "Не удалось создать клиента.");
        return;
      }

      onCreated(result.client);
      setOpen(false);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        className="crm-deal-create-client-btn"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        + Создать клиента
      </button>
    );
  }

  return (
    <div className="crm-deal-create-client">
      <div className="crm-deal-create-client-head">
        <strong>Новый клиент</strong>
        <button
          type="button"
          className="crm-deal-create-client-cancel"
          onClick={() => setOpen(false)}
          disabled={isPending}
        >
          Отмена
        </button>
      </div>

      {error ? <div className="crm-deal-panel-alert crm-deal-panel-alert--error">{error}</div> : null}

      <form className="crm-deal-create-client-form" onSubmit={handleSubmit}>
        <label className="crm-deal-field">
          <span className="crm-deal-field-label">Фамилия</span>
          <input name="last_name" required className="form-field" autoFocus />
        </label>

        <label className="crm-deal-field">
          <span className="crm-deal-field-label">Имя</span>
          <input name="first_name" required className="form-field" />
        </label>

        <label className="crm-deal-field">
          <span className="crm-deal-field-label">Отчество</span>
          <input name="middle_name" className="form-field" />
        </label>

        <label className="crm-deal-field">
          <span className="crm-deal-field-label">Телефон</span>
          <input name="phone" defaultValue={phone} required className="form-field" />
        </label>

        <label className="crm-deal-field">
          <span className="crm-deal-field-label">Email</span>
          <input name="email" type="email" className="form-field" />
        </label>

        <label className="crm-deal-field">
          <span className="crm-deal-field-label">Филиал</span>
          <select name="branch_id" defaultValue={branchId ?? ""} className="form-field">
            <option value="">не выбран</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? "Создание…" : "Создать и привязать"}
        </button>
      </form>
    </div>
  );
}
