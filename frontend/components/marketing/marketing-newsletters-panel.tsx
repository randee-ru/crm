"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createMarketingCampaignAction,
  updateMarketingCampaignAction,
} from "@/app/actions/marketing";
import type { MarketingCampaignRecord, MarketingIntegrationRecord } from "@/lib/types";

type MarketingNewslettersPanelProps = {
  campaigns: MarketingCampaignRecord[];
  integrations: MarketingIntegrationRecord[];
};

const channels = [
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "messengers", label: "Мессенджеры" },
] as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MarketingNewslettersPanel({ campaigns, integrations }: MarketingNewslettersPanelProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [channel, setChannel] = useState<string>("email");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const connectedChannels = new Set(
    integrations.filter((item) => item.status === "connected").map((item) => item.provider),
  );

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await createMarketingCampaignAction({
        channel,
        title,
        subject,
        body,
        recipientsCount: 0,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      setTitle("");
      setSubject("");
      setBody("");
      router.refresh();
    });
  };

  const handleSend = (campaign: MarketingCampaignRecord) => {
    startTransition(async () => {
      const result = await updateMarketingCampaignAction(campaign.id, { status: "sent" });
      if (result.error) setError(result.error);
      router.refresh();
    });
  };

  return (
    <div className="marketing-panel">
      <div className="marketing-panel-toolbar">
        <h1>Рассылки</h1>
        <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
          + Создать рассылку
        </button>
      </div>

      <div className="marketing-channel-status">
        {channels.map((item) => (
          <div
            key={item.id}
            className={`marketing-channel-pill ${connectedChannels.has(item.id) ? "marketing-channel-pill--on" : ""}`}
          >
            {item.label}
            <span>{connectedChannels.has(item.id) ? "подключено" : "не подключено"}</span>
          </div>
        ))}
      </div>

      {showForm ? (
        <div className="marketing-form-card">
          <h2>Новая рассылка</h2>
          <label className="marketing-form-field">
            <span>Канал</span>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              {channels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="marketing-form-field">
            <span>Название</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Акция на абонементы" />
          </label>
          <label className="marketing-form-field">
            <span>Тема</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Скидка 20% до конца месяца" />
          </label>
          <label className="marketing-form-field">
            <span>Текст</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
          </label>
          {error ? <p className="marketing-form-error">{error}</p> : null}
          <div className="marketing-form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Отмена
            </button>
            <button type="button" className="btn-primary" disabled={isPending || !title.trim()} onClick={handleCreate}>
              {isPending ? "Сохраняем…" : "Сохранить черновик"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="marketing-table-wrap">
        <table className="marketing-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Канал</th>
              <th>Статус</th>
              <th>Создана</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="marketing-table-empty">
                  Рассылок пока нет. Создайте первую кампанию.
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <strong>{campaign.title}</strong>
                    {campaign.subject ? <div className="marketing-table-sub">{campaign.subject}</div> : null}
                  </td>
                  <td>{campaign.channel_label}</td>
                  <td>
                    <span className={`marketing-status marketing-status--${campaign.status}`}>
                      {campaign.status_label}
                    </span>
                  </td>
                  <td>{formatDate(campaign.created_at)}</td>
                  <td>
                    {campaign.status === "draft" ? (
                      <button
                        type="button"
                        className="marketing-table-action"
                        disabled={isPending}
                        onClick={() => handleSend(campaign)}
                      >
                        Отправить
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
