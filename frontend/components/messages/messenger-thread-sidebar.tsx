"use client";

import Link from "next/link";
import { ListFilter, MessageSquare } from "lucide-react";
import { useMemo } from "react";

import { IconSearch } from "@/components/ui/app-icon";
import { MESSENGER_PROVIDER_LABELS, type MessengerChannelProvider } from "@/lib/messenger";
import type { MessengerThreadRecord } from "@/lib/types";

type MessengerThreadSidebarProps = {
  provider: MessengerChannelProvider;
  threads: MessengerThreadRecord[];
  activeThreadId: number | null;
  search?: string;
};

function formatThreadDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
}

export function MessengerThreadSidebar({
  provider,
  threads,
  activeThreadId,
  search = "",
}: MessengerThreadSidebarProps) {
  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter(
      (thread) =>
        (thread.contact_name ?? "").toLowerCase().includes(query) ||
        (thread.contact_phone ?? "").toLowerCase().includes(query) ||
        (thread.last_message_preview ?? "").toLowerCase().includes(query) ||
        (thread.client_name ?? "").toLowerCase().includes(query),
    );
  }, [threads, search]);

  return (
    <aside className="messages-sidebar">
      <div className="messages-sidebar-toolbar">
        <button type="button" className="messages-sidebar-filter" aria-label="Фильтр диалогов">
          <ListFilter size={16} strokeWidth={1.75} />
        </button>
        <label className="messages-sidebar-search">
          <IconSearch size={14} className="messages-sidebar-search-icon" />
          <span className="sr-only">Поиск</span>
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Найти клиента или диалог"
            className="messages-sidebar-search-input"
          />
        </label>
      </div>

      <div className="messages-channel-badge">{MESSENGER_PROVIDER_LABELS[provider]}</div>

      <div className="messages-chat-list">
        {filteredThreads.map((thread) => {
          const isActive = thread.id === activeThreadId;
          const title = thread.client_name || thread.contact_name || thread.contact_phone || "Диалог";
          return (
            <Link
              key={thread.id}
              href={`/dashboard/messages?view=${provider}&thread=${thread.id}`}
              className={`messages-chat-item ${isActive ? "messages-chat-item--active" : ""}`}
            >
              <span className="messages-chat-icon" aria-hidden="true">
                <MessageSquare size={18} strokeWidth={1.75} />
              </span>
              <span className="messages-chat-content">
                <span className="messages-chat-title-row">
                  <span className="messages-chat-title">{title}</span>
                  <span className="messages-chat-date">{formatThreadDate(thread.last_message_at)}</span>
                </span>
                <span className="messages-chat-preview">
                  {thread.last_message_preview ?? "Нет сообщений"}
                  {thread.unread_count > 0 ? (
                    <span className="messages-unread-badge">{thread.unread_count}</span>
                  ) : null}
                </span>
              </span>
            </Link>
          );
        })}
        {filteredThreads.length === 0 ? (
          <p className="messages-channel-empty-sidebar">Диалогов пока нет</p>
        ) : null}
      </div>
    </aside>
  );
}
