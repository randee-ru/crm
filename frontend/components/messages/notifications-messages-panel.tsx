"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { deleteNotificationAction, markNotificationReadAction } from "@/app/actions/notifications";
import { IconBell, IconCheck, IconPhone, IconX } from "@/components/ui/app-icon";
import { formatDateTime } from "@/lib/api";
import type { NotificationRecord } from "@/lib/types";

type NotificationsMessagesPanelProps = {
  notifications: NotificationRecord[];
};

export function NotificationsMessagesPanel({ notifications }: NotificationsMessagesPanelProps) {
  const router = useRouter();

  return (
    <section className="messages-chat-panel">
      <header className="messages-chat-panel-header">
        <div className="messages-notifications-header-copy">
          <span className="messages-notifications-header-icon" aria-hidden="true">
            <IconBell size={18} />
          </span>
          <div>
            <h2 className="messages-chat-panel-title">Уведомления</h2>
            <p className="messages-chat-panel-subtitle">История системных уведомлений и событий CRM</p>
          </div>
        </div>
        <div className="messages-notifications-header-note">Все события в одном месте</div>
      </header>

      <div className="messages-chat-thread">
        {notifications.length === 0 ? (
          <div className="messages-empty-state messages-empty-state--compact">
            <div className="messages-empty-illustration" aria-hidden="true">
              <IconBell size={48} strokeWidth={1.5} className="text-[var(--muted)]" />
            </div>
            <h3 className="messages-empty-title">Уведомлений нет</h3>
            <p className="messages-empty-text">Непрочитанные уведомления появятся здесь автоматически.</p>
          </div>
        ) : (
          notifications.map((item) => {
            const isRead = item.is_read;
            const clientId = getClientId(item);
            const title = item.title || "Уведомление";
            const kind = kindLabel(item);
            const isCall = eventType(item).startsWith("call.");

            return (
              <article
                key={item.id}
                className={`messages-notification-card ${isRead ? "messages-notification-card--read" : ""} ${
                  isCall ? "messages-notification-card--call" : ""
                }`}
              >
                <div className="messages-notification-card-top">
                  <span className="messages-notification-card-icon" aria-hidden="true">
                    {isCall ? <IconPhone size={16} /> : <IconBell size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="messages-notification-card-row">
                      <p className="messages-notification-card-title">{title}</p>
                      <span className="messages-notification-card-time">{formatDateTime(item.created_at)}</span>
                    </div>
                    <div className="messages-notification-card-meta">
                      <span className="messages-notification-card-badge">{kind}</span>
                      {isRead ? (
                        <span className="messages-notification-card-state">
                          <IconCheck size={12} />
                          Прочитано
                        </span>
                      ) : (
                        <span className="messages-notification-card-state messages-notification-card-state--unread">
                          Новое
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {item.body ? <p className="messages-notification-card-body">{item.body}</p> : null}

                <div className="messages-notification-actions">
                  {item.target_url ? (
                    <Link
                      href={item.target_url}
                      className="messages-notification-action messages-notification-action--primary"
                      onClick={async () => {
                        await markNotificationReadAction(item.id);
                        router.refresh();
                      }}
                    >
                      Открыть
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="messages-notification-action messages-notification-action--primary"
                      onClick={async () => {
                        await markNotificationReadAction(item.id);
                        router.refresh();
                      }}
                    >
                      Прочитано
                    </button>
                  )}
                  {clientId ? (
                    <Link
                      href={`/dashboard/clients/${clientId}`}
                      className="messages-notification-action messages-notification-action--ghost"
                    >
                      Клиент
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="messages-notification-action messages-notification-action--danger"
                    onClick={async () => {
                      await deleteNotificationAction(item.id);
                      router.refresh();
                    }}
                  >
                    <IconX size={14} />
                    Удалить
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function getClientId(item: NotificationRecord): number | null {
  const raw = item.payload?.client_id;
  return typeof raw === "number" ? raw : null;
}
