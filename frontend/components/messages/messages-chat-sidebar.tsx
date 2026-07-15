"use client";

import Link from "next/link";
import { ListFilter, MessageSquare, Newspaper, SquarePen, User } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { IconSearch } from "@/components/ui/app-icon";
import type { ChatRoomRecord } from "@/lib/types";

type MessagesChatSidebarProps = {
  rooms: ChatRoomRecord[];
  activeRoomKey: string | null;
  search?: string;
};

function roomIcon(room: ChatRoomRecord): ReactNode {
  if (room.room_type === "company_news") return <Newspaper size={18} strokeWidth={1.75} />;
  if (room.room_type === "general") return <MessageSquare size={18} strokeWidth={1.75} />;
  return <User size={18} strokeWidth={1.75} />;
}

function formatRoomDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
}

export function MessagesChatSidebar({ rooms, activeRoomKey, search = "" }: MessagesChatSidebarProps) {
  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rooms;
    return rooms.filter(
      (room) =>
        room.title.toLowerCase().includes(query) ||
        (room.last_message_preview ?? "").toLowerCase().includes(query),
    );
  }, [rooms, search]);

  return (
    <aside className="messages-sidebar">
      <div className="messages-sidebar-toolbar">
        <button type="button" className="messages-sidebar-filter" aria-label="Фильтр чатов">
          <ListFilter size={16} strokeWidth={1.75} />
        </button>
        <label className="messages-sidebar-search">
          <IconSearch size={14} className="messages-sidebar-search-icon" />
          <span className="sr-only">Поиск</span>
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Найти сотрудника или чат"
            className="messages-sidebar-search-input"
          />
        </label>
        <button type="button" className="messages-sidebar-compose" aria-label="Новый чат">
          <SquarePen size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className="messages-chat-list">
        {filteredRooms.map((room) => {
          const isActive = activeRoomKey === room.slug || activeRoomKey === String(room.id);
          return (
            <Link
              key={room.id}
              href={`/dashboard/messages?room=${room.slug === "notifications" ? room.slug : room.id}`}
              className={`messages-chat-item ${isActive ? "messages-chat-item--active" : ""}`}
            >
              <span className="messages-chat-icon" aria-hidden="true">
                {roomIcon(room)}
              </span>
              <span className="messages-chat-content">
                <span className="messages-chat-title-row">
                  <span className="messages-chat-title">{room.title}</span>
                  <span className="messages-chat-date">{formatRoomDate(room.last_message_at)}</span>
                </span>
                <span className="messages-chat-preview">
                  {room.last_message_author ? `${room.last_message_author}: ` : ""}
                  {room.last_message_preview ?? "Нет сообщений"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
