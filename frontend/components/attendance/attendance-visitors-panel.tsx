"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { useMemo } from "react";
import type { AttendanceRecord } from "@/lib/types";

type AttendanceVisitorsTableProps = {
  records: AttendanceRecord[];
};

function formatEntryTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AttendanceVisitorsTable({ records }: AttendanceVisitorsTableProps) {
  const sorted = useMemo(
    () =>
      [...records].sort((a, b) => {
        const aTime = a.checked_in_at ? new Date(a.checked_in_at).getTime() : 0;
        const bTime = b.checked_in_at ? new Date(b.checked_in_at).getTime() : 0;
        return bTime - aTime;
      }),
    [records],
  );

  return (
    <div className="attendance-table-wrap">
      <table className="attendance-table">
        <thead>
          <tr>
            <th>
              <input type="checkbox" aria-label="Выбрать все" disabled />
            </th>
            <th>Вход</th>
            <th>В клубе</th>
            <th>Клиент</th>
            <th>Аренда</th>
            <th>Долг</th>
            <th>Ключ</th>
            <th>Основание</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length > 0 ? (
            sorted.map((record) => (
              <tr key={record.id}>
                <td>
                  <input type="checkbox" aria-label={`Выбрать ${record.client_name}`} disabled />
                </td>
                <td>{formatEntryTime(record.checked_in_at)}</td>
                <td>{record.duration_label ?? "—"}</td>
                <td>
                  <Link href={`/dashboard/attendance/${record.id}`} className="attendance-client-name">
                    {record.client_name}
                  </Link>
                </td>
                <td className="attendance-muted">—</td>
                <td className="attendance-muted">—</td>
                <td>{record.locker_key || "—"}</td>
                <td>{record.membership_title || "—"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="attendance-empty-cell">
                Посетителей по выбранному фильтру нет.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type AttendanceToolbarProps = {
  when: string;
  person: string;
  date?: string;
  count: number;
};

export function AttendanceToolbar({ when, person, date, count }: AttendanceToolbarProps) {
  const buildHref = (nextWhen: string, nextPerson = person): ComponentProps<typeof Link>["href"] => {
    const params = new URLSearchParams();
    params.set("when", nextWhen);
    params.set("person", nextPerson);
    if (nextWhen === "date" && date) params.set("date", date);
    return `/dashboard/attendance?${params.toString()}` as ComponentProps<typeof Link>["href"];
  };

  return (
    <div className="attendance-toolbar">
      <div className="attendance-toolbar-left">
        <h1 className="attendance-title">В клубе {count} посетителей</h1>
        <div className="attendance-when-tabs">
          {[
            { id: "now", label: "Сейчас" },
            { id: "today", label: "Сегодня" },
            { id: "yesterday", label: "Вчера" },
            { id: "date", label: "На дату" },
          ].map((tab) => (
            <Link
              key={tab.id}
              href={buildHref(tab.id)}
              className={`attendance-when-tab ${when === tab.id ? "attendance-when-tab--active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="attendance-toolbar-right">
        <span className="attendance-journal-label">Журнал проходов</span>
        <div className="attendance-person-tabs">
          {[
            { id: "clients", label: "Клиенты" },
            { id: "staff", label: "Сотрудники" },
            { id: "all", label: "Все" },
          ].map((tab) => (
            <Link
              key={tab.id}
              href={buildHref(when, tab.id)}
              className={`attendance-person-tab ${person === tab.id ? "attendance-person-tab--active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <button type="button" className="attendance-print-btn">
          Печать
        </button>
      </div>
    </div>
  );
}
