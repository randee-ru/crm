"use client";

import { useState } from "react";

const feedTabs = ["Сообщение", "Событие", "Опрос", "Ещё"] as const;

export function FeedComposer() {
  const [activeTab, setActiveTab] = useState(0);
  const [message, setMessage] = useState("");
  const [posted, setPosted] = useState<string | null>(null);

  return (
    <div className="border-b border-[var(--line)] px-4 py-3">
      <div className="flex flex-wrap gap-1">
        {feedTabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(index)}
            className={`rounded px-3 py-1.5 text-[13px] font-medium transition ${
              index === activeTab
                ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "text-[var(--muted)] hover:bg-[var(--panel-muted)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Написать сообщение ..."
        className="form-field mt-3 min-h-[72px] resize-none bg-[var(--panel-muted)]"
      />
      {posted ? (
        <p className="mt-2 rounded-md border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[12px] text-[var(--muted)]">
          Сообщение добавлено в ленту (демо): «{posted}»
        </p>
      ) : null}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => {
            const trimmed = message.trim();
            if (!trimmed) return;
            setPosted(trimmed);
            setMessage("");
          }}
          className="btn-primary"
        >
          ОТПРАВИТЬ
        </button>
      </div>
    </div>
  );
}
