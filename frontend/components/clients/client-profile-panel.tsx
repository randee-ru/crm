"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cake } from "lucide-react";
import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClientNoteAction, deleteClientNoteAction, updateClientNoteAction } from "@/app/actions/client-notes";
import { updateClientAction } from "@/app/actions/clients";
import { ClickToCallChip } from "@/components/telephony/click-to-call-chip";
import { TelephonyAudioPlayer } from "@/components/telephony/telephony-audio-player";
import {
  IconArrowLeft,
  IconCalendarCheck,
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
import type { ActionState } from "@/lib/types";

const MESSENGER_CHANNEL_LABELS: Record<string, string> = {
  max: "МАКС",
  telegram: "Телеграм",
  whatsapp: "Вотсапп",
  sms_ru: "SMS.ru",
};

function formatClientMessageChannel(channel: string, messageType: string): string {
  const key = channel.trim().toLowerCase();
  if (key && MESSENGER_CHANNEL_LABELS[key]) {
    return MESSENGER_CHANNEL_LABELS[key];
  }
  return channel || messageType || "Сообщение";
}

function formatLessonStatus(status: string): string {
  const key = status.trim().toLowerCase();
  if (key === "confirmed") return "Запланировано";
  if (key === "completed") return "Проведено";
  if (key === "cancelled") return "Отменено";
  if (key === "waitlist") return "Лист ожидания";
  if (key === "draft") return "Черновик";
  return status || "Занятие";
}

function formatLessonSource(source: string): string {
  const key = source.trim().toLowerCase();
  if (!key) return "";
  if (key.includes("schedule") || key.includes("group")) return "Расписание";
  if (key.includes("1c") || key.includes("1с")) return "1C";
  if (key === "crm" || key === "manual") return "CRM";
  return source;
}

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
  kind: "call" | "message" | "lesson" | "lead" | "deal" | "sale" | "event";
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
  canManageBlocks?: boolean;
  canManageMarketing?: boolean;
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
      title: formatClientMessageChannel(message.channel, message.message_type),
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

  for (const lesson of profile.lessons) {
    items.push({
      id: `lesson-${lesson.id}`,
      at: lesson.starts_at,
      kind: "lesson",
      title:
        lesson.status === "cancelled"
          ? `Отмена занятия · ${lesson.title}`
          : lesson.status === "completed"
            ? `Занятие проведено · ${lesson.title}`
            : `Запись на занятие · ${lesson.title}`,
      body: lesson.payment_basis || undefined,
      meta: [formatLessonStatus(lesson.status), lesson.room, formatLessonSource(lesson.source), lesson.lesson_type]
        .filter(Boolean)
        .join(" · "),
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
    case "lessons":
      return profile.lessons.length || null;
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

export function ClientProfilePanel({
  profile,
  client,
  branches,
  canManageBlocks = false,
  canManageMarketing = false,
}: ClientProfilePanelProps) {
  const [tab, setTab] = useState<TabId>("main");
  const [showEdit, setShowEdit] = useState(false);
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [player, setPlayer] = useState<{ callId: number; title: string; duration: number } | null>(null);
  const [editState, editAction] = useActionState(updateClientAction.bind(null, client.id), {} as ActionState);
  const [noteState, noteAction] = useActionState(createClientNoteAction.bind(null, client.id), {} as ActionState);
  const router = useRouter();

  const timeline = useMemo(() => buildTimeline(profile), [profile]);
  const timelineGroups = useMemo(() => groupTimelineByDate(timeline), [timeline]);

  const smsMessages = profile.messages.filter((item) => item.message_type === "sms");
  const emailMessages = profile.messages.filter(
    (item) => item.message_type.includes("mail") || item.channel.toLowerCase().includes("mail"),
  );

  const statusText = statusLabel(profile);
  const latestNote = profile.notes_entries[0]?.body?.trim() || "";

  useEffect(() => {
    if (editState.success) {
      setShowEdit(false);
    }
  }, [editState.success]);

  function handleQuickAction(action: "deal" | "task" | "note" | "lesson" | "message") {
    if (action === "note") {
      setShowNotesEditor(true);
      setTab("main");
      window.setTimeout(() => {
        document.getElementById("client-notes-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
      return;
    }

    const targets: Record<Exclude<typeof action, "note">, string> = {
      deal: "/dashboard/sales",
      task: "/dashboard/tasks/new",
      lesson: "/dashboard/schedule",
      message: "/dashboard/messages",
    };

    router.push(targets[action as Exclude<typeof action, "note">]);
  }

  return (
    <div className="client-card">
      <header className="client-card-hero">
        <div className="client-card-hero-top">
          <Link href="/dashboard/clients" className="client-card-back">
            <IconArrowLeft size={15} className="client-card-back-icon" />
            К списку клиентов
          </Link>
          {showEdit ? (
            <button type="submit" form="client-inline-edit-form" className="client-card-save">
              {editState.error ? "Попробовать снова" : "Сохранить"}
            </button>
          ) : (
            <button type="button" className="client-card-save" onClick={() => setShowEdit(true)}>
              Редактировать
            </button>
          )}
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
                <ClickToCallChip phone={profile.phone} clientId={profile.id}>
                  {profile.secondary_phone ? `${profile.phone} · доп.: ${profile.secondary_phone}` : profile.phone}
                </ClickToCallChip>
              ) : null}
              {profile.email ? (
                <a href={`mailto:${profile.email}`} className="client-card-meta-chip">
                  <IconMail size={14} />
                  {profile.email}
                </a>
              ) : null}
              {profile.registration_date ? <span className="client-card-meta-chip">с {formatClientDate(profile.registration_date)}</span> : null}
              {profile.manager_name ? <span className="client-card-meta-chip">Менеджер: {profile.manager_name}</span> : null}
              {profile.club_access_blocked ? <span className="client-card-meta-chip client-card-meta-chip--danger">Блок входа</span> : null}
              {profile.group_programs_blocked ? <span className="client-card-meta-chip client-card-meta-chip--danger">Блок групп</span> : null}
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
                <form id="client-inline-edit-form" action={editAction} className="client-inline-edit">
                  {editState.error ? <p className="client-inline-edit-error">{editState.error}</p> : null}
                  <input type="hidden" name="last_name" value={client.last_name} />
                  <input type="hidden" name="first_name" value={client.first_name} />
                  <input type="hidden" name="middle_name" value={client.middle_name ?? ""} />
                  <input type="hidden" name="branch_id" value={client.branch_id ?? ""} />
                  {!(showEdit && canManageMarketing) ? <input type="hidden" name="notes" value={client.notes ?? ""} /> : null}
                  {!(showEdit && canManageMarketing) ? <input type="hidden" name="lead_source" value={client.lead_source ?? ""} /> : null}
                  {!(showEdit && canManageMarketing) ? (
                    <input type="hidden" name="acquisition_channel" value={client.acquisition_channel ?? ""} />
                  ) : null}
                  {!(showEdit && canManageMarketing) ? <input type="hidden" name="manager_name" value={client.manager_name ?? ""} /> : null}
                  <input type="hidden" name="is_active" value={client.is_active ? "on" : ""} />
                  <input type="hidden" name="club_access_blocked" value={client.club_access_blocked ? "on" : ""} />
                  <input type="hidden" name="group_programs_blocked" value={client.group_programs_blocked ? "on" : ""} />
                  {showEdit ? (
                    <>
                      <InlineContactField
                        icon={<IconPhone size={16} />}
                        label="Основной телефон"
                        name="phone"
                        defaultValue={client.phone}
                        required
                      />
                      <InlineContactField
                        icon={<IconPhone size={16} />}
                        label="Дополнительный телефон"
                        name="secondary_phone"
                        defaultValue={client.secondary_phone || ""}
                      />
                      <InlineContactField
                        icon={<IconMail size={16} />}
                        label="Email"
                        name="email"
                        defaultValue={client.email}
                        type="email"
                      />
                      <InlineContactField
                        icon={<Cake size={16} />}
                        label="Дата рождения"
                        name="birth_date"
                        defaultValue={client.birth_date ?? ""}
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                      />
                    </>
                  ) : (
                    <>
                      <ContactField icon={<IconPhone size={16} />} label="Основной телефон" value={profile.phone} />
                      <ContactField icon={<IconPhone size={16} />} label="Дополнительный телефон" value={profile.secondary_phone || ""} />
                      <ContactField icon={<IconMail size={16} />} label="Email" value={profile.email} />
                      <ContactField
                        icon={<Cake size={16} />}
                        label="Дата рождения"
                        value={profile.birth_date ? formatClientDate(profile.birth_date) : ""}
                      />
                      <ContactField icon={<IconIdCard size={16} />} label="Паспорт" value={profile.passport} />
                    </>
                  )}
                </form>
              </SidebarCard>

              <SidebarCard title="Клуб и абонемент">
                <InfoLine label="Клуб" value={profile.club_name} />
                <InfoLine label="Филиал" value={profile.branch_name || profile.club_name} />
                <InfoLine label="Абонемент" value={profile.membership_name} />
                <InfoLine label="Карта" value={profile.card_number} />
              </SidebarCard>

              <SidebarCard title="Блокировки">
                <InfoLine label="Вход в клуб" value={profile.club_access_blocked ? "Заблокирован" : "Разрешён"} />
                <InfoLine
                  label="Групповые программы"
                  value={profile.group_programs_blocked ? "Заблокированы" : "Разрешены"}
                />
                <InfoLine
                  label="Кто может снять"
                  value={canManageBlocks ? "Администратор, менеджер, руководитель" : "Только управляющие роли"}
                />
              </SidebarCard>

              <SidebarCard title="Маркетинг">
                {showEdit && canManageMarketing ? (
                  <>
                    <InlineInfoField label="Источник" name="lead_source" defaultValue={client.lead_source} />
                    <InlineInfoField label="Канал" name="acquisition_channel" defaultValue={client.acquisition_channel} />
                    <InlineInfoField label="Менеджер" name="manager_name" defaultValue={client.manager_name} />
                  </>
                ) : (
                  <>
                    <InfoLine label="Источник" value={profile.lead_source} />
                    <InfoLine label="Канал" value={profile.acquisition_channel} />
                    <InfoLine label="Менеджер" value={profile.manager_name} />
                  </>
                )}
              </SidebarCard>
            </aside>

            <section className="client-card-timeline">
              <div className="client-card-timeline-toolbar">
                <span className="client-card-timeline-toolbar-label">Быстрые действия</span>
                <div className="client-card-timeline-actions">
                  <button type="button" className="client-card-action-btn" onClick={() => handleQuickAction("deal")}>Сделка</button>
                  <button type="button" className="client-card-action-btn" onClick={() => handleQuickAction("task")}>Задача</button>
                  <button type="button" className="client-card-action-btn" onClick={() => handleQuickAction("note")}>Заметка</button>
                  <button type="button" className="client-card-action-btn" onClick={() => handleQuickAction("lesson")}>Занятие</button>
                  <button type="button" className="client-card-action-btn" onClick={() => handleQuickAction("message")}>Сообщение</button>
                </div>
              </div>

              <div className="client-card-note-summary" id="client-note-section">
                <span className="client-card-note-summary-label">Последняя заметка</span>
                <p className="client-card-note-summary-body">{latestNote || "Заметок пока нет"}</p>
              </div>

              <section className="client-notes-panel" id="client-notes-section">
                <div className="client-notes-panel-head">
                  <div>
                    <h2>Заметки клиента</h2>
                    <p>История комментариев, заметок и рабочих пометок.</p>
                  </div>
                  <button type="button" className="client-card-action-btn" onClick={() => setShowNotesEditor((value) => !value)}>
                    {showNotesEditor ? "Скрыть редактор" : "Новая заметка"}
                  </button>
                </div>

                {showNotesEditor ? (
                  <form action={noteAction} className="client-note-create-form">
                    {noteState.error ? <p className="client-inline-edit-error">{noteState.error}</p> : null}
                    <textarea name="body" rows={4} className="client-card-notes-input" placeholder="Напишите заметку..." />
                    <div className="client-note-create-actions">
                      <button type="submit" className="client-card-save">Сохранить</button>
                    </div>
                  </form>
                ) : null}

                <div className="client-notes-list">
                  {profile.notes_entries.length === 0 ? (
                    <div className="client-notes-empty">Заметок пока нет</div>
                  ) : (
                    profile.notes_entries.map((note) => {
                      const isEditing = editingNoteId === note.id;
                      return (
                        <article key={note.id} className="client-note-item">
                          {isEditing ? (
                            <form
                              action={updateClientNoteAction.bind(null, client.id, note.id)}
                              className="client-note-edit-form"
                            >
                              <textarea name="body" defaultValue={note.body} rows={4} className="client-card-notes-input" />
                              <div className="client-note-item-actions">
                                <button type="submit" className="client-card-save">Сохранить</button>
                                <button type="button" className="client-card-action-btn" onClick={() => setEditingNoteId(null)}>
                                  Отмена
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <p className="client-note-item-body">{note.body}</p>
                              <div className="client-note-item-meta">
                                <span>{formatDateTime(note.created_at)}</span>
                                <div className="client-note-item-actions">
                                  <button type="button" className="client-card-action-btn" onClick={() => setEditingNoteId(note.id)}>
                                    Редактировать
                                  </button>
                                  <button
                                    type="button"
                                    className="client-card-action-btn client-card-meta-chip--danger"
                                    onClick={async () => {
                                      await deleteClientNoteAction(client.id, note.id);
                                      router.refresh();
                                    }}
                                  >
                                    Удалить
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              </section>

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
            headers={["Занятие", "Начало", "Окончание", "Зал", "Статус", "Источник"]}
            rows={profile.lessons.map((item) => [
              item.title,
              formatDateTime(item.starts_at),
              formatDateTime(item.ends_at),
              item.room || "—",
              formatLessonStatus(item.status),
              formatLessonSource(item.source) || "—",
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
  if (kind === "lesson") return <IconCalendarCheck size={14} />;
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

function InlineContactField({
  icon,
  label,
  name,
  defaultValue,
  type = "text",
  required,
  max,
}: {
  icon: ReactNode;
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
  max?: string;
}) {
  return (
    <label className="client-card-contact client-card-contact--editable">
      <span className="client-card-contact-icon" aria-hidden>
        {icon}
      </span>
      <div className="client-card-contact-edit">
        <span className="client-card-contact-label">{label}</span>
        <input
          name={name}
          defaultValue={defaultValue}
          type={type}
          required={required}
          max={max}
          className="client-card-contact-input"
        />
      </div>
    </label>
  );
}

function InlineInfoField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="client-card-info-line client-card-info-line--editable">
      <span>{label}</span>
      <input name={name} defaultValue={defaultValue} className="client-card-info-input" />
    </label>
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
            <strong>{formatClientMessageChannel(item.channel, item.message_type)}</strong>
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
