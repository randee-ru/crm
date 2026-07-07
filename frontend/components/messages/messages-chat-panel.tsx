"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { sendChatMessageAction } from "@/app/actions/messages";
import { formatDateTime } from "@/lib/api";
import { MessageSquare } from "lucide-react";
import type { ChatMessageRecord, ChatRoomRecord } from "@/lib/types";

type MessagesChatPanelProps = {
  room: ChatRoomRecord | null;
  initialMessages: ChatMessageRecord[];
  currentUserName: string;
};

export function MessagesChatPanel({ room, initialMessages, currentUserName }: MessagesChatPanelProps) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [initialMessages, room?.id]);

  if (!room) {
    return (
      <section className="messages-empty-state">
        <div className="messages-empty-illustration" aria-hidden="true">
          <MessageSquare size={48} strokeWidth={1.5} className="text-[var(--muted)]" />
        </div>
        <h2 className="messages-empty-title">Выберите чат и начните общение</h2>
        <p className="messages-empty-text">или</p>
        <button type="button" className="messages-empty-action">
          Пригласите команду
        </button>
      </section>
    );
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await sendChatMessageAction(room.id, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDraft("");
      router.refresh();
    });
  };

  return (
    <section className="messages-chat-panel">
      <header className="messages-chat-panel-header">
        <div>
          <h2 className="messages-chat-panel-title">{room.title}</h2>
          <p className="messages-chat-panel-subtitle">
            {room.room_type === "company_news" ? "Новости клуба" : "Командный чат"}
          </p>
        </div>
      </header>

      <div className="messages-chat-thread">
        {initialMessages.map((message) => {
          const isMine = message.author_name === currentUserName;
          return (
            <article
              key={message.id}
              className={`messages-bubble-row ${isMine ? "messages-bubble-row--mine" : ""}`}
            >
              {!isMine ? (
                <span className="messages-bubble-avatar" aria-hidden="true">
                  {message.author_initials}
                </span>
              ) : null}
              <div className={`messages-bubble ${isMine ? "messages-bubble--mine" : ""}`}>
                {!isMine ? <p className="messages-bubble-author">{message.author_name}</p> : null}
                <p className="messages-bubble-text">{message.body}</p>
                <time className="messages-bubble-time" dateTime={message.created_at}>
                  {formatDateTime(message.created_at)}
                </time>
              </div>
            </article>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form className="messages-composer" onSubmit={handleSubmit}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Напишите сообщение..."
          className="messages-composer-input"
          rows={2}
          disabled={isPending}
        />
        <div className="messages-composer-actions">
          {error ? <p className="messages-composer-error">{error}</p> : null}
          <button type="submit" className="btn-primary" disabled={isPending || !draft.trim()}>
            {isPending ? "Отправка…" : "Отправить"}
          </button>
        </div>
      </form>
    </section>
  );
}
