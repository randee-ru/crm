"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ClientForm } from "@/components/client-form";
import { TelephonyAudioPlayer } from "@/components/telephony/telephony-audio-player";
import {
  IconArrowLeft,
  IconCheckCircle,
  IconFile,
  IconIdCard,
  IconMail,
  IconPhone,
  IconPhoneIncoming,
  IconPlay,
} from "@/components/ui/app-icon";
import {
  clientStatusLabels,
  formatCallDuration,
  formatClientDate,
  formatDateTime,
  formatMoney,
  getClientInitials,
} from "@/lib/api";
import type { BranchOption, ClientDetail, ClientProfile } from "@/lib/types";

const tabs = [
  { id: "main", label: "Обзор" },
  { id: "memberships", label: "Членства" },
  { id: "packages", label: "Пакеты" },
  { id: "finance", label: "Финансы" },
  { id: "sales", label: "Продажи" },
  { id: "visits", label: "Посещения" },
  { id: "lessons", label: "Занятия" },
  { id: "settlements", label: "Взаиморасчёты" },
  { id: "achievements", label: "Достижения" },
  { id: "email", label: "E-mail" },
  { id: "sms", label: "SMS" },
  { id: "contracts", label: "Договоры" },
  { id: "tasks", label: "Задачи" },
  { id: "history", label: "История" },
  { id: "calls", label: "Звонки" },
  { id: "reviews", label: "Отзывы" },
  { id: "files", label: "Файлы" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type TimelineItem = {
  id: string;
  at: string;
  kind: "call" | "message" | "lead" | "deal" | "sale" | "event";
  title: string;
  body?: string;
  meta?: string;
  callId?: number;
  hasRecording?: boolean;
};

type ClientProfilePanelProps = {
  profile: ClientProfile;
  client: ClientDetail;
  branches: BranchOption[];
};

function statusLabel(profile: ClientProfile): string {
  return profile.client_status_label || clientStatusLabels[profile.client_status] || profile.client_status || "Клиент";
}

function buildTimeline(profile: ClientProfile): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const call of profile.calls) {
    items.push({
      id: `call-${call.id}`,
      at: call.started_at,
      kind: "call",
      title:
        call.direction === "incoming"
          ? `Входящий звонок · ${call.line_display || call.line_name || "Телефония"}`
          : `Исходящий звонок · ${call.line_display || call.line_name || "Телефония"}`,
      body: call.call_summary || call.transcription_text || undefined,
      meta: `${call.caller_phone || "—"} · ${formatCallDuration(call.duration)}`,
      callId: call.id,
      hasRecording: call.has_recording,
    });
  }

  for (const message of profile.messages) {
    items.push({
      id: `message-${message.id}`,
      at: message.sent_at || "",
      kind: "message",
      title: message.channel || message.message_type || "Сообщение",
      body: message.body,
      meta: [message.kind, message.phone].filter(Boolean).join(" · "),
    });
  }

  for (const lead of profile.leads) {
    items.push({
      id: `lead-${lead.id}`,
      at: lead.lead_date || "",
      kind: "lead",
      title: lead.title || "Лид",
      body: lead.comment,
      meta: [lead.status, lead.channel, lead.manager_name].filter(Boolean).join(" · "),
    });
  }

  for (const deal of profile.deals) {
    items.push({
      id: `deal-${deal.id}`,
      at: deal.created_at,
      kind: "deal",
      title: deal.title,
      body: deal.description,
      meta: [deal.stage_name, deal.manager_name, formatMoney(deal.amount)].filter(Boolean).join(" · "),
    });
  }

  for (const sale of profile.sales) {
    items.push({
      id: `sale-${sale.id}`,
      at: sale.sold_at || sale.created_at,
      kind: "sale",
      title: sale.title || sale.external_number || "Продажа",
      meta: formatMoney(sale.total_amount),
    });
  }

  if (profile.registration_date) {
    items.push({
      id: "registered",
      at: `${profile.registration_date}T12:00:00`,
      kind: "event",
      title: "Клиент зарегистрирован",
      meta: profile.club_name || undefined,
    });
  }

  return items
    .filter((item) => item.at)
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
}

function groupTimelineByDate(items: TimelineItem[]): Array<{ date: string; items: TimelineItem[] }> {
  const groups = new Map<string, TimelineItem[]>();
  for (const item of items) {
    const date = formatClientDate(item.at);
    const bucket = groups.get(date) ?? [];
    bucket.push(item);
    groups.set(date, bucket);
  }
  return Array.from(groups.entries()).map(([date, grouped]) => ({ date, items: grouped }));
}

function tabCount(profile: ClientProfile, tabId: TabId): number | null {
  switch (tabId) {
    case "calls":
      return profile.calls.length || null;
    case "sales":
      return profile.sales.length || null;
    case "memberships":
      return profile.memberships.length || null;
    case "visits":
      return profile.visits.length || null;
    case "history":
      return buildTimeline(profile).length || null;
    default:
      return null;
  }
}

export function ClientProfilePanel({ profile, client, branches }: ClientProfilePanelProps) {
  const [tab, setTab] = useState<TabId>("main");
  const [showEdit, setShowEdit] = useState(false);
  const [player, setPlayer] = useState<{ callId: number; title: string; duration: number } | null>(null);

  const timeline = useMemo(() => buildTimeline(profile), [profile]);
  const timelineGroups = useMemo(() => groupTimelineByDate(timeline), [timeline]);

  const smsMessages = profile.messages.filter((item) => item.message_type === "sms");
  const emailMessages = profile.messages.filter(
    (item) => item.message_type.includes("mail") || item.channel.toLowerCase().includes("mail"),
  );

  const statusText = statusLabel(profile);

  return (
    <div className="client-card">
      <header className="client-card-hero">
        <div className="client-card-hero-top">
          <Link href="/dashboard/clients" className="client-card-back">
            <IconArrowLeft size={15} className="client-card-back-icon" />
            К списку клиентов
          </Link>
          <button type="button" className="client-card-save" onClick={() => setShowEdit((value) => !value)}>
            {showEdit ? "Скрыть редактирование" : "Редактировать"}
          </button>
        </div>

        <div className="client-card-hero-main">
          <div className="client-card-avatar-wrap">
            <div className="client-card-avatar">{getClientInitials(profile.full_name)}</div>
          </div>
          <div className="client-card-hero-info">
            <div className="client-card-hero-title-row">
              <h1 className="client-card-title">{profile.full_name}</h1>
              <span className={`client-card-status client-card-status--${profile.client_status || "lead"}`}>{statusText}</span>
            </div>
            <div className="client-card-header-meta">
              {profile.phone ? (
                <a href={`tel:${profile.phone}`} className="client-card-meta-chip">
                  <IconPhone size={14} />
                  {profile.phone}
                </a>
              ) : null}
              {profile.email ? (
                <a href={`mailto:${profile.email}`} className="client-card-meta-chip">
                  <IconMail size={14} />
                  {profile.email}
                </a>
              ) : null}
              {profile.registration_date ? <span className="client-card-meta-chip">с {formatClientDate(profile.registration_date)}</span> : null}
              {profile.manager_name ? <span className="client-card-meta-chip">Менеджер: {profile.manager_name}</span> : null}
            </div>
          </div>
        </div>

        <div className="client-card-stats">
          <StatCard label="LTV" value={formatMoney(profile.ltv_total)} />
          <StatCard label="Визитов" value={String(profile.visit_count)} />
          <StatCard
            label="Последний визит"
            value={profile.last_visit_date ? formatClientDate(profile.last_visit_date) : "—"}
          />
          <StatCard label="Звонков" value={String(profile.calls.length)} />
        </div>
      </header>

      <nav className="client-card-tabs" aria-label="Разделы карточки клиента">
        {tabs.map((item) => {
          const count = tabCount(profile, item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={`client-card-tab${tab === item.id ? " client-card-tab--active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {count ? <span className="client-card-tab-count">{count}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className={`client-card-body${player ? " client-card-body--player-open" : ""}`}>
        {tab === "main" ? (
          <div className="client-card-main-layout">
            <aside className="client-card-sidebar">
              <SidebarCard title="Контакты">
                <ContactField icon={<IconPhone size={16} />} label="Телефон" value={profile.phone} />
                <ContactField icon={<IconMail size={16} />} label="Email" value={profile.email} />
                <ContactField icon={<IconIdCard size={16} />} label="Паспорт" value={profile.passport} />
              </SidebarCard>

              <SidebarCard title="Клуб и абонемент">
                <InfoLine label="Клуб" value={profile.club_name} />
                <InfoLine label="Филиал" value={profile.branch_name || profile.club_name} />
                <InfoLine label="Абонемент" value={profile.membership_name} />
                <InfoLine label="Карта" value={profile.card_number} />
              </SidebarCard>

              <SidebarCard title="Маркетинг">
                <InfoLine label="Источник" value={profile.lead_source} />
                <InfoLine label="Канал" value={profile.acquisition_channel} />
                <InfoLine label="Менеджер" value={profile.manager_name} />
              </SidebarCard>

              <SidebarCard title="Комментарий">
                <p className="client-card-notes">{profile.notes || "Комментарий не указан"}</p>
              </SidebarCard>
            </aside>

            <section className="client-card-timeline">
              <div className="client-card-timeline-toolbar">
                <span className="client-card-timeline-toolbar-label">Быстрые действия</span>
                <div className="client-card-timeline-actions">
                  <button type="button" className="client-card-action-btn">Сделка</button>
                  <button type="button" className="client-card-action-btn">Задача</button>
                  <button type="button" className="client-card-action-btn">Заметка</button>
                  <button type="button" className="client-card-action-btn">Занятие</button>
                  <button type="button" className="client-card-action-btn">Сообщение</button>
                </div>
              </div>

              {timelineGroups.length === 0 ? (
                <div className="client-card-empty-state">
                  <strong>История пуста</strong>
                  <p>Звонки, сообщения и продажи появятся здесь автоматически</p>
                </div>
              ) : (
                timelineGroups.map((group) => (
                  <div key={group.date} className="client-card-timeline-group">
                    <h3>{group.date}</h3>
                    <div className="client-card-timeline-list">
                      {group.items.map((item) => (
                        <article key={item.id} className={`client-card-timeline-item client-card-timeline-item--${item.kind}`}>
                          <div className="client-card-timeline-marker" aria-hidden>
                            <TimelineIcon kind={item.kind} />
                          </div>
                          <div className="client-card-timeline-content">
                            <div className="client-card-timeline-row">
                              <div>
                                <strong>{item.title}</strong>
                                <span className="client-card-timeline-time">{formatDateTime(item.at).split(", ").pop()}</span>
                              </div>
                              {item.kind === "call" && item.hasRecording && item.callId ? (
                                <button
                                  type="button"
                                  className="client-card-listen-btn"
                                  onClick={() =>
                                    setPlayer({
                                      callId: item.callId!,
                                      title: profile.full_name,
                                      duration: profile.calls.find((call) => call.id === item.callId)?.duration || 0,
                                    })
                                  }
                                >
                                  <IconPlay size={13} />
                                  Слушать
                                </button>
                              ) : null}
                            </div>
                            {item.meta ? <p className="client-card-timeline-meta">{item.meta}</p> : null}
                            {item.body ? <p className="client-card-timeline-body">{item.body}</p> : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        ) : null}

        {tab === "memberships" ? (
          <DataTable
            headers={["Абонемент", "Статус", "С", "До", "Стоимость"]}
            rows={profile.memberships.map((item) => [
              item.title,
              item.status,
              formatClientDate(item.starts_at),
              formatClientDate(item.ends_at),
              formatMoney(item.price),
            ])}
            empty="Членства не найдены"
          />
        ) : null}

        {tab === "packages" ? (
          <PlaceholderTab
            title="Пакеты"
            description="Пакеты услуг появятся здесь после синхронизации с 1С."
            fallbackRows={profile.memberships.map((item) => [item.title, item.status, formatClientDate(item.ends_at)])}
            headers={["Пакет", "Статус", "Действует до"]}
          />
        ) : null}

        {tab === "finance" ? (
          <DataTable
            headers={["Дата", "Операция", "Сумма", "Оплачено", "Статус"]}
            rows={profile.sales.map((item) => [
              formatDateTime(item.sold_at || item.created_at),
              item.title || item.external_number || "Продажа",
              formatMoney(item.total_amount),
              formatMoney(item.paid_amount),
              item.status,
            ])}
            empty="Финансовых операций нет"
          />
        ) : null}

        {tab === "sales" ? (
          <DataTable
            headers={["Дата", "Номер", "Сумма", "Оплачено", "Промокод"]}
            rows={profile.sales.map((item) => [
              formatDateTime(item.sold_at || item.created_at),
              item.external_number || "—",
              formatMoney(item.total_amount),
              formatMoney(item.paid_amount),
              item.promo_code || "—",
            ])}
            empty="Продаж нет"
          />
        ) : null}

        {tab === "visits" ? (
          <DataTable
            headers={["Вход", "Выход", "Длительность", "Зал", "Источник"]}
            rows={profile.visits.map((item) => [
              formatDateTime(item.checked_in_at),
              formatDateTime(item.checked_out_at),
              item.duration_minutes ? `${item.duration_minutes} мин` : "—",
              item.room || "—",
              item.visit_source || "—",
            ])}
            empty="Посещений нет"
          />
        ) : null}

        {tab === "lessons" ? (
          <DataTable
            headers={["Занятие", "Начало", "Окончание", "Зал", "Статус"]}
            rows={profile.lessons.map((item) => [
              item.title,
              formatDateTime(item.starts_at),
              formatDateTime(item.ends_at),
              item.room || "—",
              item.status,
            ])}
            empty="Занятий нет"
          />
        ) : null}

        {tab === "settlements" ? <EmptySection title="Взаиморасчёты" text="Раздел подключится после выгрузки взаиморасчетов из 1С." /> : null}
        {tab === "achievements" ? <EmptySection title="Достижения" text="Достижения клиента появятся после интеграции с 1С." /> : null}
        {tab === "email" ? <MessageList messages={emailMessages} empty="E-mail сообщений нет" /> : null}
        {tab === "sms" ? <MessageList messages={smsMessages} empty="SMS сообщений нет" /> : null}

        {tab === "contracts" ? (
          <DataTable
            headers={["Договор", "Статус абонемента", "Клуб", "Менеджер"]}
            rows={
              profile.contract_ref
                ? [[profile.contract_ref, profile.membership_status || "—", profile.club_name || "—", profile.manager_name || "—"]]
                : []
            }
            empty="Договоры не указаны"
          />
        ) : null}

        {tab === "tasks" ? <EmptySection title="Задачи" text="Задачи по клиенту можно смотреть в разделе CRM." /> : null}
        {tab === "history" ? <HistoryList timeline={timeline} onPlay={setPlayer} profileName={profile.full_name} calls={profile.calls} /> : null}

        {tab === "calls" ? (
          <DataTable
            headers={["Дата", "Направление", "Линия", "Номер", "Длительность", "Запись"]}
            rows={profile.calls.map((item) => [
              formatDateTime(item.started_at),
              item.direction === "incoming" ? "Входящий" : "Исходящий",
              item.line_display || item.line_name || "—",
              item.caller_phone || item.target_phone || "—",
              formatCallDuration(item.duration),
              item.has_recording ? "Есть" : "—",
            ])}
            empty="Звонков не найдено"
            actions={profile.calls.map((item) =>
              item.has_recording ? (
                <button
                  key={item.id}
                  type="button"
                  className="client-card-listen-btn"
                  onClick={() => setPlayer({ callId: item.id, title: profile.full_name, duration: item.duration })}
                >
                  <IconPlay size={13} />
                  Слушать
                </button>
              ) : null,
            )}
          />
        ) : null}

        {tab === "reviews" ? <EmptySection title="Оценки и отзывы" text="Отзывы клиента появятся после подключения модуля оценок." /> : null}
        {tab === "files" ? <EmptySection title="Файлы" text="Файлы клиента можно будет прикреплять в следующих этапах." /> : null}

        {showEdit ? (
          <section className="client-card-edit">
            <h2>Редактирование клиента</h2>
            <ClientForm branches={branches} client={client} mode="edit" />
          </section>
        ) : null}
      </div>

      {player ? (
        <TelephonyAudioPlayer
          callId={player.callId}
          title={player.title}
          durationHint={player.duration}
          onClose={() => setPlayer(null)}
        />
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="client-card-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="client-card-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function TimelineIcon({ kind }: { kind: TimelineItem["kind"] }) {
  if (kind === "call") return <IconPhoneIncoming size={14} />;
  if (kind === "message") return <IconMail size={14} />;
  if (kind === "sale") return <IconCheckCircle size={14} />;
  if (kind === "deal") return <IconFile size={14} />;
  return <IconCheckCircle size={14} />;
}

function ContactField({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="client-card-contact">
      <span className="client-card-contact-icon" aria-hidden>
        {icon}
      </span>
      <div>
        <span className="client-card-contact-label">{label}</span>
        <strong>{value || "—"}</strong>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="client-card-info-line">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function EmptySection({ title, text }: { title: string; text: string }) {
  return (
    <section className="client-card-placeholder">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

function PlaceholderTab({
  title,
  description,
  headers,
  fallbackRows,
}: {
  title: string;
  description: string;
  headers: string[];
  fallbackRows: string[][];
}) {
  if (fallbackRows.length === 0) {
    return <EmptySection title={title} text={description} />;
  }
  return <DataTable headers={headers} rows={fallbackRows} empty={description} />;
}

function MessageList({
  messages,
  empty,
}: {
  messages: ClientProfile["messages"];
  empty: string;
}) {
  if (messages.length === 0) {
    return <div className="client-card-empty-state"><p>{empty}</p></div>;
  }
  return (
    <div className="client-card-message-list">
      {messages.map((item) => (
        <article key={item.id} className="client-card-message">
          <header>
            <strong>{item.channel || item.message_type}</strong>
            <span>{formatDateTime(item.sent_at)}</span>
          </header>
          <p>{item.body || "—"}</p>
        </article>
      ))}
    </div>
  );
}

function HistoryList({
  timeline,
  onPlay,
  profileName,
  calls,
}: {
  timeline: TimelineItem[];
  onPlay: (value: { callId: number; title: string; duration: number }) => void;
  profileName: string;
  calls: ClientProfile["calls"];
}) {
  if (timeline.length === 0) {
    return (
      <div className="client-card-empty-state">
        <strong>История пуста</strong>
        <p>События по клиенту появятся здесь</p>
      </div>
    );
  }
  return (
    <div className="client-card-history-list">
      {timeline.map((item) => (
        <article key={item.id} className={`client-card-history-item client-card-timeline-item--${item.kind}`}>
          <div>
            <strong>{item.title}</strong>
            <p>{item.meta}</p>
            {item.body ? <p>{item.body}</p> : null}
          </div>
          <div className="client-card-history-side">
            <span>{formatDateTime(item.at)}</span>
            {item.kind === "call" && item.hasRecording && item.callId ? (
              <button
                type="button"
                className="client-card-listen-btn"
                onClick={() =>
                  onPlay({
                    callId: item.callId!,
                    title: profileName,
                    duration: calls.find((call) => call.id === item.callId)?.duration || 0,
                  })
                }
              >
                <IconPlay size={13} />
                Слушать
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function DataTable({
  headers,
  rows,
  empty,
  actions,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
  actions?: Array<ReactNode | null>;
}) {
  if (rows.length === 0) {
    return (
      <div className="client-card-empty-state">
        <p>{empty}</p>
      </div>
    );
  }

  return (
    <div className="client-card-table-wrap">
      <table className="client-card-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
            {actions ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`}>{cell}</td>
              ))}
              {actions ? <td>{actions[index]}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
