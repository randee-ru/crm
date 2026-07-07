"use client";

import Link from "next/link";

import { useNotifications } from "@/components/notifications-provider";

export function NotificationsPanel() {
  const { isOpen, closePanel, markAllRead, unreadCount, notifications } = useNotifications();

  if (!isOpen) return null;

  const items = notifications.slice(0, 12);

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
            items.map((item) => (
              <Link
                key={item.id}
                href={(item.target_url || "/dashboard") as never}
                onClick={closePanel}
                className={`flex gap-3 border-b border-[var(--line)] px-4 py-3 transition hover:bg-[var(--panel-muted)] ${
                  !item.is_read ? "bg-[var(--accent-soft)]/40" : ""
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    !item.is_read ? "bg-[var(--accent)]" : "bg-transparent"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-[var(--text)]">{item.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-5 text-[var(--muted)]">
                    {item.body}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] text-[var(--muted)]">
                  {new Intl.DateTimeFormat("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(item.created_at))}
                </span>
              </Link>
            ))
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
