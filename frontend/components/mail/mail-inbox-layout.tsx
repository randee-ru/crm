"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { markMailReadAction, sendMailMessageAction } from "@/app/actions/mail";
import type { MailAccountRecord, MailMessageRecord } from "@/lib/types";

const folders = [
  { id: "inbox", label: "Входящие" },
  { id: "sent", label: "Отправленные" },
  { id: "drafts", label: "Черновики" },
  { id: "trash", label: "Корзина" },
] as const;

type MailInboxLayoutProps = {
  account: MailAccountRecord;
  messages: MailMessageRecord[];
  activeFolder: string;
  activeMessageId: number | null;
  search?: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MailInboxLayout({
  account,
  messages,
  activeFolder,
  activeMessageId,
  search = "",
}: MailInboxLayoutProps) {
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [toEmails, setToEmails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeMessage = messages.find((message) => message.id === activeMessageId) ?? messages[0] ?? null;

  useEffect(() => {
    if (!activeMessage || activeMessage.is_read) return;
    startTransition(async () => {
      await markMailReadAction(account.id, activeMessage.id);
      router.refresh();
    });
  }, [account.id, activeMessage, router]);

  const handleSend = () => {
    setError(null);
    startTransition(async () => {
      const result = await sendMailMessageAction(account.id, { subject, body, toEmails });
      if (result.error) {
        setError(result.error);
        return;
      }
      setComposeOpen(false);
      setSubject("");
      setBody("");
      setToEmails("");
      router.refresh();
    });
  };

  return (
    <div className="mail-inbox-layout">
      <aside className="mail-folders">
        <div className="mail-account-card">
          <span className="mail-account-provider">{account.provider_label}</span>
          <strong>{account.email}</strong>
          {account.unread_count > 0 ? (
            <span className="mail-account-unread">{account.unread_count} непрочитанных</span>
          ) : null}
        </div>
        <nav className="mail-folder-list" aria-label="Папки почты">
          {folders.map((folder) => (
            <Link
              key={folder.id}
              href={`/dashboard/mail?folder=${folder.id}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className={`mail-folder-link ${activeFolder === folder.id ? "mail-folder-link--active" : ""}`}
            >
              {folder.label}
            </Link>
          ))}
        </nav>
        <button type="button" className="mail-compose-btn" onClick={() => setComposeOpen(true)}>
          Написать письмо
        </button>
      </aside>

      <section className="mail-message-list">
        <form className="mail-search" method="get">
          <input type="hidden" name="folder" value={activeFolder} />
          <input
            name="search"
            type="search"
            defaultValue={search}
            placeholder="Поиск по теме"
            className="mail-search-input"
          />
        </form>
        <div className="mail-message-items">
          {messages.length === 0 ? (
            <p className="mail-empty">В этой папке пока нет писем</p>
          ) : (
            messages.map((message) => (
              <Link
                key={message.id}
                href={`/dashboard/mail?folder=${activeFolder}&message=${message.id}${
                  search ? `&search=${encodeURIComponent(search)}` : ""
                }`}
                className={`mail-message-item ${!message.is_read ? "mail-message-item--unread" : ""} ${
                  activeMessage?.id === message.id ? "mail-message-item--active" : ""
                }`}
              >
                <div className="mail-message-item-top">
                  <strong>{message.from_name || message.from_email}</strong>
                  <span>{formatDate(message.sent_at)}</span>
                </div>
                <div className="mail-message-item-subject">{message.subject}</div>
                <div className="mail-message-item-preview">{message.body}</div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="mail-message-view">
        {composeOpen ? (
          <div className="mail-compose-panel">
            <h2>Новое письмо</h2>
            <label className="mail-compose-field">
              <span>Кому</span>
              <input value={toEmails} onChange={(e) => setToEmails(e.target.value)} placeholder="client@mail.ru" />
            </label>
            <label className="mail-compose-field">
              <span>Тема</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Тема письма" />
            </label>
            <label className="mail-compose-field">
              <span>Текст</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
            </label>
            {error ? <p className="mail-compose-error">{error}</p> : null}
            <div className="mail-compose-actions">
              <button type="button" className="btn-secondary" onClick={() => setComposeOpen(false)}>
                Отмена
              </button>
              <button type="button" className="btn-primary" disabled={isPending} onClick={handleSend}>
                {isPending ? "Отправляем…" : "Отправить"}
              </button>
            </div>
          </div>
        ) : activeMessage ? (
          <article className="mail-message-detail">
            <header>
              <h2>{activeMessage.subject}</h2>
              <p>
                <strong>От:</strong> {activeMessage.from_name} &lt;{activeMessage.from_email}&gt;
              </p>
              <p>
                <strong>Кому:</strong> {activeMessage.to_emails}
              </p>
              <p className="mail-message-date">{formatDate(activeMessage.sent_at)}</p>
            </header>
            <div className="mail-message-body">{activeMessage.body}</div>
          </article>
        ) : (
          <div className="mail-empty-view">
            <p>Выберите письмо или напишите новое</p>
          </div>
        )}
      </section>
    </div>
  );
}
