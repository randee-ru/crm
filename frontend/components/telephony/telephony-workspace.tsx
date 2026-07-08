"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TelephonyAudioPlayer } from "@/components/telephony/telephony-audio-player";
import { TelephonyCallDirection } from "@/components/telephony/telephony-call-direction";
import {
  IconPlay,
  IconReport,
  IconTranscribe,
} from "@/components/ui/app-icon";
import { ListPagination } from "@/components/list-pagination";
import { formatCallDuration, formatDateTime, formatPhoneDisplay } from "@/lib/api";
import type { CallListFilters, CallLogRecord, TelephonyDashboardStats, TelephonyIntegrationRecord, TelephonyLineStat } from "@/lib/types";
import {
  listCallsAction,
  reportCallAction,
  transcribeCallAction,
  updateTelephonyIntegrationAction,
} from "@/app/actions/telephony";

const PAGE_SIZE = 100;
const SEARCH_MIN = 3;

const DEFAULT_LINES: TelephonyLineStat[] = [
  { key: "reception", label: "База Ресепшн", number: "74951203639", count: 0 },
  { key: "managers", label: "Менеджеры", number: "74951203639", count: 0 },
  { key: "ksenia", label: "Ксения сим", number: "79330914404", count: 0 },
  { key: "alexandra", label: "Александра сим", number: "79330910414", count: 0 },
];

function formatLineChipLabel(line: TelephonyLineStat) {
  return line.label;
}

function splitLineDisplay(value: string): { name: string; phone?: string } {
  const [name, phone] = value.split(" · ").map((part) => part.trim());
  if (phone) return { name, phone };
  return { name: value };
}

type TelephonyWorkspaceProps = {
  integration: TelephonyIntegrationRecord;
  dashboard: TelephonyDashboardStats;
  initialTab: "dashboard" | "calls" | "settings";
};

type ActivePlayer = {
  callId: number;
  title: string;
  duration: number;
};

export function TelephonyWorkspace({ integration, dashboard, initialTab }: TelephonyWorkspaceProps) {
  const [tab, setTab] = useState(initialTab);
  const [period, setPeriod] = useState<CallListFilters["period"]>("today");
  const [status, setStatus] = useState<CallListFilters["status"]>("");
  const [line, setLine] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [calls, setCalls] = useState<CallLogRecord[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState({
    provider: integration.provider,
    api_url: integration.api_url,
    api_key: "",
    api_secret: "",
    public_app_url: integration.public_app_url || "",
    click_to_call_extension: String(integration.settings?.click_to_call_extension || ""),
    click_to_call_line: String(integration.settings?.click_to_call_line || ""),
  });
  const [player, setPlayer] = useState<ActivePlayer | null>(null);
  const [modalText, setModalText] = useState<string | null>(null);

  const lineOptions = dashboard.lines?.length ? dashboard.lines : DEFAULT_LINES;

  const effectiveSearch = searchInput.trim().length >= SEARCH_MIN ? searchInput.trim() : "";

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (tab !== "calls") return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await listCallsAction({ period, status, search: effectiveSearch, line: line || undefined, page });
        if (!cancelled) {
          setCalls(response.results);
          setCount(response.count);
        }
      } catch {
        if (!cancelled) setCalls([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, period, status, effectiveSearch, line, page]);

  async function handleSaveSettings() {
    setMessage("");
    try {
      await updateTelephonyIntegrationAction({
        provider: settings.provider,
        api_url: settings.api_url,
        ...(settings.api_key ? { api_key: settings.api_key } : {}),
        ...(settings.api_secret ? { api_secret: settings.api_secret } : {}),
        settings: {
          ...(integration.settings || {}),
          public_app_url: settings.public_app_url.trim(),
          click_to_call_extension: settings.click_to_call_extension.trim(),
          click_to_call_line: settings.click_to_call_line.trim(),
        },
      });
      setMessage("Настройки сохранены");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить");
    }
  }

  function handlePlay(call: CallLogRecord) {
    setMessage("");
    setPlayer({
      callId: call.id,
      title: call.client_name || call.caller_phone || "Запись звонка",
      duration: call.duration,
    });
  }

  async function handleTranscribe(call: CallLogRecord) {
    try {
      const result = await transcribeCallAction(call.id);
      setModalText(result.transcription_text);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка транскрипции");
    }
  }

  async function handleReport(call: CallLogRecord) {
    try {
      if (!call.transcription_text) {
        await transcribeCallAction(call.id);
      }
      const result = await reportCallAction(call.id);
      setModalText(result.call_report);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка анализа");
    }
  }

  return (
    <div className={`telephony-workspace-body${player ? " telephony-workspace-body--player-open" : ""}`}>
      {message ? <p className="telephony-message telephony-message--error">{message}</p> : null}

      {tab === "dashboard" ? (
        <div className="telephony-dashboard-grid">
          <div className="telephony-stat-card">
            <span>Сегодня</span>
            <strong>{dashboard.today_calls}</strong>
          </div>
          <div className="telephony-stat-card">
            <span>Отвечено</span>
            <strong>{dashboard.today_answered}</strong>
          </div>
          <div className="telephony-stat-card">
            <span>Пропущено</span>
            <strong>{dashboard.today_missed}</strong>
          </div>
          <div className="telephony-stat-card">
            <span>С записью</span>
            <strong>{dashboard.with_recording}</strong>
          </div>
        </div>
      ) : null}

      {tab === "calls" ? (
        <div className="telephony-calls-panel">
          <div className="telephony-filters">
            <div className="telephony-filter-row">
              <div className="telephony-period-tabs">
                {(["today", "yesterday", "week", "month"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`telephony-chip${period === value ? " telephony-chip--active" : ""}`}
                    onClick={() => {
                      setPeriod(value);
                      setPage(1);
                    }}
                  >
                    {value === "today" ? "Сегодня" : value === "yesterday" ? "Вчера" : value === "week" ? "Неделя" : "Месяц"}
                  </button>
                ))}
              </div>
              <div className="telephony-status-tabs">
                {[
                  ["", `Все (${count})`],
                  ["answered", "Отвечено"],
                  ["missed", "Пропущено"],
                ].map(([value, label]) => (
                  <button
                    key={value || "all"}
                    type="button"
                    className={`telephony-chip${status === value ? " telephony-chip--active" : ""}`}
                    onClick={() => {
                      setStatus(value as CallListFilters["status"]);
                      setPage(1);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                className="telephony-search"
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setPage(1);
                }}
                placeholder="Поиск по номеру, клиенту, линии…"
              />
            </div>
            <div className="telephony-line-tabs">
              <button
                type="button"
                className={`telephony-chip${!line ? " telephony-chip--active" : ""}`}
                onClick={() => {
                  setLine("");
                  setPage(1);
                }}
              >
                Все линии
              </button>
              {lineOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`telephony-chip${line === item.key ? " telephony-chip--active" : ""}`}
                  onClick={() => {
                    setLine(item.key);
                    setPage(1);
                  }}
                  title={item.number ? `+${item.number}` : item.label}
                >
                  {formatLineChipLabel(item)}
                  {item.count > 0 ? ` (${item.count})` : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="telephony-table-wrap">
            <table className="telephony-table">
              <colgroup>
                <col className="telephony-col-status" />
                <col className="telephony-col-datetime" />
                <col className="telephony-col-phone" />
                <col className="telephony-col-client" />
                <col className="telephony-col-line" />
                <col className="telephony-col-duration" />
                <col className="telephony-col-recording" />
                <col className="telephony-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Звонок</th>
                  <th>Дата / время</th>
                  <th>Номер</th>
                  <th>Клиент</th>
                  <th>Линия</th>
                  <th>Длит.</th>
                  <th>Запись</th>
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => {
                  const lineText = call.line_display || call.line_name || "—";
                  const lineParts = splitLineDisplay(lineText);
                  return (
                  <tr key={call.id}>
                    <td className="telephony-table-direction">
                      <TelephonyCallDirection
                        direction={call.direction}
                        missed={call.status === "missed"}
                        variant="pill"
                      />
                    </td>
                    <td className="telephony-table-datetime">
                      <span className="telephony-datetime-date">{formatDateTime(call.started_at).split(",")[0]}</span>
                      <span className="telephony-datetime-time">{formatDateTime(call.started_at).split(",")[1]?.trim()}</span>
                    </td>
                    <td className="telephony-table-phone">{formatPhoneDisplay(call.caller_phone)}</td>
                    <td className="telephony-table-client">
                      {call.client_id ? (
                        <Link href={`/dashboard/clients/${call.client_id}`} className="telephony-client-link" title={call.client_name ?? undefined}>
                          {call.client_name}
                        </Link>
                      ) : (
                        <span className="telephony-client-missing">Не найден</span>
                      )}
                    </td>
                    <td className="telephony-table-line">
                      <span className="telephony-line-name" title={lineText}>{lineParts.name}</span>
                      {lineParts.phone ? <span className="telephony-line-phone">{lineParts.phone}</span> : null}
                    </td>
                    <td className="telephony-table-duration">{formatCallDuration(call.duration)}</td>
                    <td className="telephony-table-recording">
                      {call.has_recording ? (
                        <span className="telephony-recording-pill">Запись</span>
                      ) : (
                        <span className="telephony-recording-pill telephony-recording-pill--empty">—</span>
                      )}
                    </td>
                    <td className="telephony-actions">
                      {call.has_recording ? (
                        <div className="telephony-action-group">
                          <button type="button" className="telephony-action-btn telephony-action-btn--primary" onClick={() => void handlePlay(call)} title="Прослушать">
                            <IconPlay size={14} />
                            <span>Слушать</span>
                          </button>
                          <button type="button" className="telephony-icon-btn" onClick={() => void handleTranscribe(call)} title="Транскрипция">
                            <IconTranscribe size={15} />
                          </button>
                          <button type="button" className="telephony-icon-btn" onClick={() => void handleReport(call)} title="AI-отчёт">
                            <IconReport size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="telephony-actions-empty">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && calls.length === 0 ? <p className="telephony-empty">Звонков не найдено</p> : null}
          </div>

          <ListPagination page={page} pageSize={PAGE_SIZE} total={count} disabled={loading} onPageChange={setPage} />
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="telephony-settings">
          <label>
            Провайдер
            <select
              value={settings.provider}
              onChange={(event) => setSettings((prev) => ({ ...prev, provider: event.target.value }))}
            >
              <option value="none">Не подключено</option>
              <option value="mango">Mango Office</option>
              <option value="binotel">Binotel</option>
              <option value="zadarma">Zadarma</option>
              <option value="webhook">Webhook</option>
            </select>
          </label>
          <label>
            API URL
            <input
              value={settings.api_url}
              onChange={(event) => setSettings((prev) => ({ ...prev, api_url: event.target.value }))}
            />
          </label>
          <label>
            API Key {integration.has_api_key ? <span className="telephony-saved">сохранён</span> : null}
            <input
              type="password"
              value={settings.api_key}
              onChange={(event) => setSettings((prev) => ({ ...prev, api_key: event.target.value }))}
              placeholder={integration.has_api_key ? "Оставьте пустым, чтобы не менять" : ""}
            />
          </label>
          <label>
            API Salt {integration.has_api_secret ? <span className="telephony-saved">сохранён</span> : null}
            <input
              type="password"
              value={settings.api_secret}
              onChange={(event) => setSettings((prev) => ({ ...prev, api_secret: event.target.value }))}
              placeholder={integration.has_api_secret ? "Оставьте пустым, чтобы не менять" : ""}
            />
          </label>

          <div className="telephony-webhook-box">
            <div className="telephony-webhook-head">
              <strong>Webhook для Mango Office</strong>
              <span>Вставьте этот адрес во «Внешние системы»</span>
            </div>
            <div className="telephony-webhook-url-row">
              <code className="telephony-webhook-url">
                {integration.mango_webhook_url || `${settings.public_app_url || "https://ваш-ngrok.ngrok-free.dev"}/api/mango/callback`}
              </code>
              <button
                type="button"
                className="telephony-webhook-copy"
                onClick={() => {
                  const url =
                    integration.mango_webhook_url ||
                    `${settings.public_app_url.replace(/\/$/, "")}/api/mango/callback`;
                  void navigator.clipboard.writeText(url);
                  setMessage("Адрес webhook скопирован");
                }}
              >
                Копировать
              </button>
            </div>
          </div>

          <label>
            Публичный URL (ngrok)
            <input
              value={settings.public_app_url}
              onChange={(event) => setSettings((prev) => ({ ...prev, public_app_url: event.target.value }))}
              placeholder="https://appliable-desperately-moshe.ngrok-free.dev"
            />
          </label>
          <label>
            Внутренний номер Mango (click-to-call)
            <input
              value={settings.click_to_call_extension}
              onChange={(event) => setSettings((prev) => ({ ...prev, click_to_call_extension: event.target.value }))}
              placeholder="например 4"
            />
          </label>
          <label>
            Линия исходящего (АОН)
            <input
              value={settings.click_to_call_line}
              onChange={(event) => setSettings((prev) => ({ ...prev, click_to_call_line: event.target.value }))}
              placeholder="74951203639"
            />
          </label>
          <p className="telephony-settings-hint">
            При клике на номер в карточке клиента CRM звонит через Mango на ваш добавочный, затем соединяет с клиентом.
            Укажите URL из ngrok без слэша в конце. После смены ngrok обновите здесь и в Mango Office.
          </p>
          <button type="button" className="btn-primary" onClick={() => void handleSaveSettings()}>
            Сохранить
          </button>
        </div>
      ) : null}

      {modalText ? (
        <div className="telephony-modal-backdrop" onClick={() => setModalText(null)}>
          <div className="telephony-modal" onClick={(event) => event.stopPropagation()}>
            <pre>{modalText}</pre>
            <button type="button" onClick={() => setModalText(null)}>
              Закрыть
            </button>
          </div>
        </div>
      ) : null}

      {player ? (
        <TelephonyAudioPlayer
          callId={player.callId}
          title={player.title}
          durationHint={player.duration}
          onClose={() => setPlayer(null)}
        />
      ) : null}
    </div>
  );
}
