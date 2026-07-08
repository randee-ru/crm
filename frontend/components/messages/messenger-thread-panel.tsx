"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  markMessengerThreadReadAction,
  sendMessengerMessageAction,
} from "@/app/actions/messenger";
import { MessengerAccountConnect } from "@/components/messages/messenger-account-connect";
import { formatDateTime } from "@/lib/api";
import { MESSENGER_PROVIDER_LABELS, type MessengerChannelProvider } from "@/lib/messenger";
import { MessageSquare } from "lucide-react";
import type {
  MessengerAccountRecord,
  MessengerIntegrationRecord,
  MessengerMessageRecord,
  MessengerThreadRecord,
} from "@/lib/types";

type MessengerThreadPanelProps = {
  provider: MessengerChannelProvider;
  integration: MessengerIntegrationRecord | null;
  account: MessengerAccountRecord | null;
  thread: MessengerThreadRecord | null;
  initialMessages: MessengerMessageRecord[];
};

function isConnected(
  integration: MessengerIntegrationRecord | null,
  account: MessengerAccountRecord | null,
) {
  return account?.status === "ready" || Boolean(integration?.has_connected_account);
}

export function MessengerThreadPanel({
  provider,
  integration,
  account,
  thread,
  initialMessages,
}: MessengerThreadPanelProps) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [initialMessages, thread?.id]);

  useEffect(() => {
    if (!thread?.id || !thread.unread_count) return;
    void markMessengerThreadReadAction(thread.id);
  }, [thread?.id, thread?.unread_count]);

  if (!isConnected(integration, account)) {
    return <MessengerAccountConnect provider={provider} account={account} />;
  }

  if (!thread) {
    return (
      <section className="messages-empty-state">
        <div className="messages-empty-illustration" aria-hidden="true">
          <MessageSquare size={48} strokeWidth={1.5} className="text-[var(--muted)]" />
        </div>
        <h2 className="messages-empty-title">Выберите диалог {MESSENGER_PROVIDER_LABELS[provider]}</h2>
        <p className="messages-empty-text">Входящие и исходящие сообщения появятся здесь</p>
      </section>
    );
  }

  const title = thread.client_name || thread.contact_name || thread.contact_phone || "Диалог";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await sendMessengerMessageAction(thread.id, draft);
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
          <h2 className="messages-chat-panel-title">{title}</h2>
          <p className="messages-chat-panel-subtitle">
            {MESSENGER_PROVIDER_LABELS[provider]}
            {thread.contact_phone ? ` · ${thread.contact_phone}` : ""}
            {account?.phone ? ` · аккаунт ${account.phone}` : ""}
          </p>
        </div>
      </header>

      <div className="messages-chat-thread">
        {initialMessages.map((message) => {
          const isMine = message.direction === "outbound";
          return (
            <article
              key={message.id}
              className={`messages-bubble-row ${isMine ? "messages-bubble-row--mine" : ""}`}
            >
              {!isMine ? (
                <span className="messages-bubble-avatar" aria-hidden="true">
                  {(message.author_name || "К").slice(0, 1).toUpperCase()}
                </span>
              ) : null}
              <div className={`messages-bubble ${isMine ? "messages-bubble--mine" : ""}`}>
                {!isMine ? <p className="messages-bubble-author">{message.author_name}</p> : null}
                <p className="messages-bubble-text">{message.body}</p>
                <time className="messages-bubble-time" dateTime={message.sent_at}>
                  {formatDateTime(message.sent_at)}
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
          placeholder="Напишите сообщение клиенту..."
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
