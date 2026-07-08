"use client";

import { useEffect, useState, useTransition } from "react";

import { searchClientOptionsAction } from "@/app/actions/clients";
import type { ClientOption, ClientRecord } from "@/lib/types";

type CrmClientPickerProps = {
  value: number | null;
  label?: string | null;
  disabled?: boolean;
  onChange: (client: ClientRecord | null) => void;
};

export function CrmClientPicker({ value, label, disabled, onChange }: CrmClientPickerProps) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ClientOption[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (search.trim().length < 2) {
      setOptions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(async () => {
        const results = await searchClientOptionsAction(search.trim());
        setOptions(results);
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const selectedLabel = label ?? (value ? `Клиент #${value}` : "не выбран");

  return (
    <div className="crm-client-picker">
      <input type="hidden" name="client_id" value={value ?? ""} />

      {value ? (
        <div className="crm-client-picker-selected">
          <span>{selectedLabel}</span>
          <button
            type="button"
            className="crm-client-picker-clear"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Сбросить
          </button>
        </div>
      ) : (
        <p className="crm-client-picker-empty">Клиент не привязан</p>
      )}

      <label className="crm-deal-field">
        <span className="crm-deal-field-label">Найти клиента</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Фамилия, имя или телефон"
          className="form-field"
          disabled={disabled}
        />
      </label>

      {isPending ? <p className="crm-client-picker-hint">Поиск…</p> : null}

      {options.length > 0 ? (
        <ul className="crm-client-picker-results">
          {options.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                className="crm-client-picker-option"
                disabled={disabled}
                onClick={() => {
                  onChange(client as ClientRecord);
                  setSearch("");
                  setOptions([]);
                }}
              >
                <strong>{client.full_name}</strong>
                <span>{client.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {search.trim().length >= 2 && !isPending && options.length === 0 ? (
        <p className="crm-client-picker-hint">Ничего не найдено</p>
      ) : null}
    </div>
  );
}
