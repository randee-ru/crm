"use client";

import { useMemo, useState, useTransition } from "react";

import {
  createDealCommentAction,
  createDealContactAction,
  createDealTaskAction,
  updateDealTaskStatusAction,
} from "@/app/actions/deal-activities";
import { formatDateTime } from "@/lib/api";
import type {
  DealContactHistoryRecord,
  DealDetail,
  DealStageHistoryRecord,
  DealTaskRecord,
} from "@/lib/types";

type FeedTab = "activity" | "comment" | "task";

type CrmDealPanelFeedProps = {
  deal: DealDetail;
  disabled?: boolean;
  onUpdated: (deal: DealDetail) => void;
};

const CONTACT_TYPE_OPTIONS = [
  { value: "call", label: "Звонок" },
  { value: "visit", label: "Визит" },
  { value: "messenger", label: "Мессенджер" },
  { value: "email", label: "Email" },
] as const;

const TASK_STATUS_LABELS: Record<string, string> = {
  open: "Открыта",
  in_progress: "В работе",
  done: "Выполнена",
  cancelled: "Отменена",
};

function toLocalDateTimeInput(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function defaultContactDateTime(): string {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return toLocalDateTimeInput(date);
}

function isNoteContact(entry: DealContactHistoryRecord): boolean {
  return entry.contact_type === "note";
}

function isActivityContact(entry: DealContactHistoryRecord): boolean {
  return !isNoteContact(entry);
}

type TimelineEntry =
  | { kind: "contact"; id: string; at: string; entry: DealContactHistoryRecord }
  | { kind: "stage"; id: string; at: string; entry: DealStageHistoryRecord }
  | { kind: "system"; id: string; at: string; text: string };

function buildActivityTimeline(deal: DealDetail): TimelineEntry[] {
  const items: TimelineEntry[] = [];

  for (const entry of deal.contact_history ?? []) {
    if (!isActivityContact(entry)) continue;
    items.push({
      kind: "contact",
      id: `contact-${entry.id}`,
      at: entry.contacted_at,
      entry,
    });
  }

  for (const entry of deal.stage_history ?? []) {
    items.push({
      kind: "stage",
      id: `stage-${entry.id}`,
      at: entry.created_at,
      entry,
    });
  }

  if (deal.updated_at !== deal.created_at) {
    items.push({
      kind: "system",
      id: "updated",
      at: deal.updated_at,
      text: "Сделка обновлена",
    });
  }

  items.push({
    kind: "system",
    id: "created",
    at: deal.created_at,
    text: "Создана сделка",
  });

  return items.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
}

function sortComments(entries: DealContactHistoryRecord[]): DealContactHistoryRecord[] {
  return [...entries]
    .filter(isNoteContact)
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

function sortTasks(tasks: DealTaskRecord[]): DealTaskRecord[] {
  return [...tasks].sort((left, right) => {
    const leftOpen = left.status !== "done" && left.status !== "cancelled";
    const rightOpen = right.status !== "done" && right.status !== "cancelled";
    if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;
    if (left.due_at && right.due_at) {
      return new Date(left.due_at).getTime() - new Date(right.due_at).getTime();
    }
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

function isTaskOverdue(task: DealTaskRecord): boolean {
  if (!task.due_at || task.status === "done" || task.status === "cancelled") return false;
  return new Date(task.due_at).getTime() < Date.now();
}

export function CrmDealPanelFeed({ deal, disabled = false, onUpdated }: CrmDealPanelFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>("activity");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [activityType, setActivityType] = useState<string>("call");
  const [activityAt, setActivityAt] = useState(defaultContactDateTime);
  const [activityComment, setActivityComment] = useState("");
  const [showActivityForm, setShowActivityForm] = useState(false);

  const [commentText, setCommentText] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");

  const activityContacts = useMemo(
    () => (deal.contact_history ?? []).filter(isActivityContact),
    [deal.contact_history],
  );
  const comments = useMemo(
    () => sortComments(deal.contact_history ?? []),
    [deal.contact_history],
  );
  const tasks = useMemo(() => sortTasks(deal.tasks ?? []), [deal.tasks]);
  const activityTimeline = useMemo(() => buildActivityTimeline(deal), [deal]);

  const openTasks = tasks.filter((task) => task.status !== "done" && task.status !== "cancelled");
  const doneTasks = tasks.filter((task) => task.status === "done");

  const handleCreateActivity = () => {
    if (!activityComment.trim() && !activityAt) {
      setError("Укажите дату или комментарий.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await createDealContactAction(deal.id, {
        contact_type: activityType,
        contacted_at: new Date(activityAt).toISOString(),
        comment: activityComment.trim(),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.contact) {
        onUpdated({
          ...deal,
          contact_history: [result.contact, ...(deal.contact_history ?? [])],
          next_contact_at: result.contact.contacted_at,
        });
      }

      setActivityComment("");
      setShowActivityForm(false);
      setActivityAt(defaultContactDateTime());
    });
  };

  const handleCreateComment = () => {
    startTransition(async () => {
      setError(null);
      const result = await createDealCommentAction(deal.id, commentText);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.contact) {
        onUpdated({
          ...deal,
          contact_history: [result.contact, ...(deal.contact_history ?? [])],
        });
      }

      setCommentText("");
    });
  };

  const handleCreateTask = () => {
    startTransition(async () => {
      setError(null);
      const result = await createDealTaskAction(
        deal.id,
        {
          title: taskTitle,
          due_at: taskDueAt ? new Date(taskDueAt).toISOString() : null,
        },
        deal.client_id,
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.task) {
        onUpdated({
          ...deal,
          tasks: [result.task, ...(deal.tasks ?? [])],
        });
      }

      setTaskTitle("");
      setTaskDueAt("");
    });
  };

  const handleToggleTask = (task: DealTaskRecord) => {
    const nextStatus = task.status === "done" ? "open" : "done";

    startTransition(async () => {
      setError(null);
      const result = await updateDealTaskStatusAction(task.id, nextStatus);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.task) {
        onUpdated({
          ...deal,
          tasks: (deal.tasks ?? []).map((item) => (item.id === task.id ? result.task! : item)),
        });
      }
    });
  };

  const tabs: Array<{ id: FeedTab; label: string; count?: number }> = [
    { id: "activity", label: "Дело", count: activityContacts.length || undefined },
    { id: "comment", label: "Комментарий", count: comments.length || undefined },
    { id: "task", label: "Задача", count: openTasks.length || undefined },
  ];

  return (
    <aside className="crm-deal-panel-feed">
      <div className="crm-deal-feed-tabs" role="tablist" aria-label="Лента сделки">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={[
              "crm-deal-feed-tab",
              activeTab === tab.id ? "crm-deal-feed-tab--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              setActiveTab(tab.id);
              setError(null);
            }}
            disabled={disabled}
          >
            {tab.label}
            {tab.count ? <span className="crm-deal-feed-tab-count">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      {error ? <div className="crm-deal-feed-error">{error}</div> : null}

      {activeTab === "activity" ? (
        <>
          {showActivityForm ? (
            <div className="crm-deal-feed-compose">
              <label className="crm-deal-feed-field">
                <span className="crm-deal-feed-field-label">Тип</span>
                <select
                  className="form-field"
                  value={activityType}
                  onChange={(event) => setActivityType(event.target.value)}
                  disabled={disabled || isPending}
                >
                  {CONTACT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crm-deal-feed-field">
                <span className="crm-deal-feed-field-label">Когда</span>
                <input
                  type="datetime-local"
                  className="form-field"
                  value={activityAt}
                  onChange={(event) => setActivityAt(event.target.value)}
                  disabled={disabled || isPending}
                />
              </label>
              <label className="crm-deal-feed-field">
                <span className="crm-deal-feed-field-label">Комментарий</span>
                <input
                  type="text"
                  placeholder="Например: перезвонить, пробное занятие"
                  className="crm-deal-feed-input"
                  value={activityComment}
                  onChange={(event) => setActivityComment(event.target.value)}
                  disabled={disabled || isPending}
                />
              </label>
              <div className="crm-deal-feed-compose-actions">
                <button
                  type="button"
                  className="btn-primary crm-deal-feed-submit"
                  onClick={handleCreateActivity}
                  disabled={disabled || isPending}
                >
                  {isPending ? "Сохранение…" : "Запланировать"}
                </button>
                <button
                  type="button"
                  className="btn-secondary crm-deal-feed-submit"
                  onClick={() => setShowActivityForm(false)}
                  disabled={disabled || isPending}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="crm-deal-feed-compose">
              <input
                type="text"
                placeholder="Что нужно сделать"
                className="crm-deal-feed-input"
                value={activityComment}
                onChange={(event) => setActivityComment(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && activityComment.trim()) {
                    setShowActivityForm(true);
                  }
                }}
                disabled={disabled || isPending}
              />
              <button
                type="button"
                className="crm-deal-feed-quick-btn"
                onClick={() => setShowActivityForm(true)}
                disabled={disabled || isPending}
              >
                Создать дело
              </button>
            </div>
          )}

          {activityContacts.length === 0 && !showActivityForm ? (
            <div className="crm-deal-feed-empty">
              <strong>Создайте дело</strong>
              <p>Запланируйте следующий шаг с клиентом: звонок, пробное занятие или напоминание об оплате.</p>
              <button
                type="button"
                className="crm-deal-feed-promo-btn crm-deal-feed-promo-btn--active"
                onClick={() => setShowActivityForm(true)}
                disabled={disabled || isPending}
              >
                Создать дело
              </button>
            </div>
          ) : null}

          <ol className="crm-deal-timeline">
            {activityTimeline.map((item) => {
              if (item.kind === "contact") {
                const entry = item.entry;
                return (
                  <li key={item.id} className="crm-deal-timeline-item crm-deal-timeline-item--contact">
                    <span className="crm-deal-timeline-time">{formatDateTime(entry.contacted_at)}</span>
                    <span className="crm-deal-timeline-badge">{entry.contact_type_label}</span>
                    <span className="crm-deal-timeline-text">
                      {entry.comment || entry.contact_type_label}
                    </span>
                    {entry.user_name ? (
                      <span className="crm-deal-timeline-meta">{entry.user_name}</span>
                    ) : null}
                  </li>
                );
              }

              if (item.kind === "stage") {
                const entry = item.entry;
                return (
                  <li key={item.id} className="crm-deal-timeline-item">
                    <span className="crm-deal-timeline-time">{formatDateTime(entry.created_at)}</span>
                    <span className="crm-deal-timeline-text">
                      {entry.from_stage_name ? `${entry.from_stage_name} → ` : ""}
                      {entry.to_stage_name}
                      {entry.comment ? ` (${entry.comment})` : ""}
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.id} className="crm-deal-timeline-item">
                  <span className="crm-deal-timeline-time">{formatDateTime(item.at)}</span>
                  <span className="crm-deal-timeline-text">{item.text}</span>
                </li>
              );
            })}
          </ol>
        </>
      ) : null}

      {activeTab === "comment" ? (
        <>
          <div className="crm-deal-feed-compose">
            <textarea
              placeholder="Напишите комментарий…"
              className="crm-deal-feed-textarea"
              rows={3}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              disabled={disabled || isPending}
            />
            <button
              type="button"
              className="btn-primary crm-deal-feed-submit"
              onClick={handleCreateComment}
              disabled={disabled || isPending || !commentText.trim()}
            >
              {isPending ? "Отправка…" : "Добавить комментарий"}
            </button>
          </div>

          {comments.length === 0 ? (
            <div className="crm-deal-feed-empty">
              <strong>Комментариев пока нет</strong>
              <p>Зафиксируйте договорённости, возражения клиента или внутренние заметки по сделке.</p>
            </div>
          ) : (
            <ol className="crm-deal-timeline">
              {comments.map((entry) => (
                <li key={entry.id} className="crm-deal-timeline-item crm-deal-timeline-item--comment">
                  <span className="crm-deal-timeline-time">{formatDateTime(entry.created_at)}</span>
                  <span className="crm-deal-timeline-text">{entry.comment}</span>
                  {entry.user_name ? (
                    <span className="crm-deal-timeline-meta">{entry.user_name}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}

      {activeTab === "task" ? (
        <>
          <div className="crm-deal-feed-compose">
            <input
              type="text"
              placeholder="Что нужно сделать"
              className="crm-deal-feed-input"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              disabled={disabled || isPending}
            />
            <label className="crm-deal-feed-field">
              <span className="crm-deal-feed-field-label">Срок</span>
              <input
                type="datetime-local"
                className="form-field"
                value={taskDueAt}
                onChange={(event) => setTaskDueAt(event.target.value)}
                disabled={disabled || isPending}
              />
            </label>
            <button
              type="button"
              className="btn-primary crm-deal-feed-submit"
              onClick={handleCreateTask}
              disabled={disabled || isPending || !taskTitle.trim()}
            >
              {isPending ? "Создание…" : "Создать задачу"}
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="crm-deal-feed-empty">
              <strong>Задач пока нет</strong>
              <p>Добавьте задачу с дедлайном, чтобы не забыть перезвонить или отправить предложение.</p>
            </div>
          ) : (
            <div className="crm-deal-task-lists">
              {openTasks.length > 0 ? (
                <section className="crm-deal-task-section">
                  <h4 className="crm-deal-task-section-title">Открытые</h4>
                  <ul className="crm-deal-task-list">
                    {openTasks.map((task) => (
                      <li
                        key={task.id}
                        className={[
                          "crm-deal-task-item",
                          isTaskOverdue(task) ? "crm-deal-task-item--overdue" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <label className="crm-deal-task-check">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => handleToggleTask(task)}
                            disabled={disabled || isPending}
                          />
                          <span className="crm-deal-task-title">{task.title}</span>
                        </label>
                        <div className="crm-deal-task-meta">
                          {task.due_at ? (
                            <span className="crm-deal-task-due">{formatDateTime(task.due_at)}</span>
                          ) : (
                            <span className="crm-deal-task-due crm-deal-task-due--empty">Без срока</span>
                          )}
                          <span>{TASK_STATUS_LABELS[task.status] ?? task.status}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {doneTasks.length > 0 ? (
                <section className="crm-deal-task-section">
                  <h4 className="crm-deal-task-section-title">Выполненные</h4>
                  <ul className="crm-deal-task-list">
                    {doneTasks.map((task) => (
                      <li key={task.id} className="crm-deal-task-item crm-deal-task-item--done">
                        <label className="crm-deal-task-check">
                          <input
                            type="checkbox"
                            checked
                            onChange={() => handleToggleTask(task)}
                            disabled={disabled || isPending}
                          />
                          <span className="crm-deal-task-title">{task.title}</span>
                        </label>
                        {task.due_at ? (
                          <div className="crm-deal-task-meta">
                            <span className="crm-deal-task-due">{formatDateTime(task.due_at)}</span>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </aside>
  );
}
