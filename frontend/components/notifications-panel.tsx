"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useNotifications } from "@/components/notifications-provider";
import { IconPhone } from "@/components/ui/app-icon";
import type { NotificationRecord } from "@/lib/types";

function eventType(item: NotificationRecord): string {
  const event = item.payload?.event;
  return typeof event === "string" ? event : "";
}

function clientName(item: NotificationRecord): string {
  const name = item.payload?.client_name;
  return typeof name === "string" ? name.trim() : "";
}

function clientId(item: NotificationRecord): number | null {
  const raw = item.payload?.client_id;
  return typeof raw === "number" ? raw : null;
}

function kindLabel(item: NotificationRecord): string {
  const event = eventType(item);
  if (event === "call.ringing") return "Звонит";
  if (event.startsWith("call.")) return "Звонок";
  if (event === "message.new") return "Сообщение";
  if (event === "task.created") return "Задача";
  if (event === "deal.stage_changed") return "CRM";
  return item.kind;
}

export function NotificationsPanel() {
  const router = useRouter();
  const { isOpen, closePanel, markAllRead, markRead, unreadCount, notifications } = useNotifications();

  if (!isOpen) return null;

  const items = notifications.slice(0, 20);

  return (
    <>
      <button
        type="button"
        aria-label="Закрыть уведомления"
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]"
        onClick={closePanel}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Уведомления"
        className="fixed right-3 top-[calc(var(--header-height)+12px)] z-[60] w-[min(380px,calc(100vw-1.5rem))] animate-[slideInRight_0.22s_ease-out] overflow-hidden rounded-[var(--card-radius)] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text)]">Уведомления</h2>
            {unreadCount > 0 ? (
              <p className="text-[12px] text-[var(--muted)]">Непрочитанных: {unreadCount}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={markAllRead}
            className="text-[12px] font-medium text-[var(--accent-strong)] hover:underline"
          >
            Прочитать все
          </button>
        </div>

        <div className="max-h-[min(420px,60vh)] overflow-y-auto">
          {items.length > 0 ? (
            items.map((item) => {
              const name = clientName(item);
              const id = clientId(item);
              const isRinging = eventType(item) === "call.ringing";

              return (
                <div
                  key={item.id}
                  className={`notification-panel-item ${!item.is_read ? "notification-panel-item-unread" : ""} ${
                    isRinging ? "notification-panel-item-ringing" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="notification-panel-item-main"
                    onClick={() => {
                      markRead(item.id);
                      closePanel();
                      if (item.target_url) {
                        router.push(item.target_url as never);
                      }
                    }}
                  >
                    <span className="notification-panel-item-icon">
                      {eventType(item).startsWith("call.") ? <IconPhone size={16} /> : kindLabel(item)}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[var(--text)]">{item.title}</span>
                        <span className="notification-panel-item-badge">{kindLabel(item)}</span>
                      </span>
                      {name ? (
                        <button
                          type="button"
                          className="notification-panel-client-link"
                          onClick={(event) => {
                            event.stopPropagation();
                            markRead(item.id);
                            closePanel();
                            if (id) router.push(`/dashboard/clients/${id}` as never);
                          }}
                        >
                          {name}
                        </button>
                      ) : null}
                      <span className="mt-0.5 block text-[12px] leading-5 text-[var(--muted)]">{item.body}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--muted)]">
                      {new Intl.DateTimeFormat("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(item.created_at))}
                    </span>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-6 text-[13px] text-[var(--muted)]">Пока нет уведомлений.</div>
          )}
        </div>

        <div className="border-t border-[var(--line)] px-4 py-3">
          <Link
            href="/dashboard/messages"
            onClick={closePanel}
            className="text-[13px] font-medium text-[var(--accent-strong)] hover:underline"
          >
            Открыть мессенджер
          </Link>
        </div>
      </aside>
    </>
  );
}
