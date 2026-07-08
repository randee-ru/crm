"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { getDealAction, updateDealAction, updateDealStageAction } from "@/app/actions/deals";
import {
  CrmDealHeaderFunnelSelect,
  CrmDealHeaderTitle,
} from "@/components/crm-deal-panel-header";
import { CrmDealCallPlayer } from "@/components/crm-deal-call-player";
import { CrmDealPanelFeed } from "@/components/crm-deal-panel-feed";
import { CrmClientPicker } from "@/components/crm-client-picker";
import { CrmDealCreateClient } from "@/components/crm-deal-create-client";
import { useWorkspaceShell } from "@/components/workspace-shell-provider";
import { formatClientDate } from "@/lib/api";
import { formatDealAmount } from "@/lib/crm-kanban";
import type { BranchOption, ClientRecord, DealDetail, DealPipelineRecord } from "@/lib/types";

type CrmDealCardPanelProps = {
  dealId: number;
  pipeline: DealPipelineRecord;
  pipelines: DealPipelineRecord[];
  branches: BranchOption[];
  preview?: DealDetail | null;
  onClose: () => void;
};

function formatDealDate(value: string): string {
  try {
    return formatClientDate(value);
  } catch {
    return value;
  }
}

export function CrmDealCardPanel({
  dealId,
  pipeline,
  pipelines,
  branches,
  preview,
  onClose,
}: CrmDealCardPanelProps) {
  const { sidebarCollapsed } = useWorkspaceShell();
  const [mounted, setMounted] = useState(false);
  const [deal, setDeal] = useState<DealDetail | null>(preview ?? null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(preview?.client_id ?? null);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(preview?.client_name ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activePipeline = useMemo(() => {
    if (deal?.pipeline_id) {
      return pipelines.find((item) => item.id === deal.pipeline_id) ?? pipeline;
    }
    return pipeline;
  }, [deal?.pipeline_id, pipeline, pipelines]);

  const stages = useMemo(
    () => [...activePipeline.stages].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [activePipeline.stages],
  );

  const activeStageIndex = stages.findIndex((stage) => stage.id === deal?.stage_id);

  useEffect(() => {
    setSelectedClientId(deal?.client_id ?? null);
    setSelectedClientName(deal?.client_name ?? null);
  }, [deal?.client_id, deal?.client_name, deal?.id]);

  useEffect(() => {
    setDeal(preview ?? null);
    setLoadError(null);
    setSaveError(null);
    setSaveSuccess(false);
  }, [dealId, preview]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const detail = await getDealAction(dealId);
        if (!cancelled) {
          setDeal(detail);
          setSelectedClientId(detail.client_id ?? null);
          setSelectedClientName(detail.client_name ?? null);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "";
          setLoadError(
            message.includes("status 500")
              ? "Ошибка сервера при загрузке сделки. Перезапустите backend."
              : message.includes("status 404")
                ? "Сделка не найдена."
                : "Не удалось загрузить сделку.",
          );
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const panelOffset = sidebarCollapsed
    ? "var(--sidebar-width-collapsed)"
    : "var(--sidebar-width)";

  const panelStyle = {
    left: panelOffset,
  } as const;

  const handleStageClick = (stageId: number) => {
    if (!deal || deal.stage_id === stageId) return;

    const targetStage = stages.find((item) => item.id === stageId);
    if (targetStage?.is_lost && !deal.loss_reason) {
      const reason = window.prompt(
        "Укажите причину отказа (expensive, other_club, far, no_time, no_answer, changed_mind, club_dislike, no_visit, other):",
      );
      if (!reason) return;

      startTransition(async () => {
        try {
          await updateDealAction(deal.id, { stage_id: stageId, loss_reason: reason });
          setDeal((current) =>
            current
              ? {
                  ...current,
                  stage_id: stageId,
                  stage_label: targetStage.name,
                  stage_code: targetStage.code,
                  stage_color: targetStage.color,
                  loss_reason: reason,
                }
              : current,
          );
        } catch {
          setSaveError("Не удалось сменить этап.");
        }
      });
      return;
    }

    startTransition(async () => {
      try {
        await updateDealStageAction(deal.id, stageId);
        const stage = stages.find((item) => item.id === stageId);
        setDeal((current) =>
          current
            ? {
                ...current,
                stage_id: stageId,
                stage_label: stage?.name ?? current.stage_label,
                stage_code: stage?.code ?? current.stage_code,
                stage_color: stage?.color ?? current.stage_color,
              }
            : current,
        );
      } catch {
        setSaveError("Не удалось сменить этап.");
      }
    });
  };

  const handleTitleSave = async (title: string) => {
    if (!deal) return;

    const result = await updateDealAction(deal.id, { title });
    if (result.error) {
      setSaveError(result.error);
      throw new Error(result.error);
    }

    setDeal((current) => (current ? { ...current, title } : current));
    setSaveError(null);
  };

  const handlePipelineChange = (pipelineId: number) => {
    if (!deal) return;

    const nextPipeline = pipelines.find((item) => item.id === pipelineId);
    if (!nextPipeline) return;

    const firstStage = [...nextPipeline.stages].sort(
      (a, b) => a.sort_order - b.sort_order || a.id - b.id,
    )[0];

    startTransition(async () => {
      setSaveError(null);
      const result = await updateDealAction(deal.id, {
        pipeline_id: pipelineId,
        stage_id: firstStage?.id,
      });

      if (result.error) {
        setSaveError(result.error);
        return;
      }

      setDeal((current) =>
        current
          ? {
              ...current,
              pipeline_id: pipelineId,
              stage_id: firstStage?.id ?? current.stage_id,
              stage_label: firstStage?.name ?? current.stage_label,
              stage_code: firstStage?.code ?? current.stage_code,
              stage_color: firstStage?.color ?? current.stage_color,
            }
          : current,
      );
    });
  };

  const handleClientCreated = (client: ClientRecord) => {
    setSelectedClientId(client.id);
    setSelectedClientName(client.full_name);

    startTransition(async () => {
      setSaveError(null);
      const result = await updateDealAction(deal!.id, {
        client_id: client.id,
        contact_name: client.full_name,
        contact_phone: client.phone,
      });

      if (result.error) {
        setSaveError(result.error);
        return;
      }

      setDeal((current) =>
        current
          ? {
              ...current,
              client_id: client.id,
              client_name: client.full_name,
              contact_phone: client.phone,
            }
          : current,
      );
      setSaveSuccess(true);
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!deal) return;

    const formData = new FormData(event.currentTarget);
    const amount = String(formData.get("amount") ?? "0");
    const branchRaw = String(formData.get("branch_id") ?? "");

    startTransition(async () => {
      setSaveError(null);
      setSaveSuccess(false);
      const result = await updateDealAction(deal.id, {
        title: deal.title,
        amount,
        client_id: selectedClientId,
        branch_id: branchRaw ? Number(branchRaw) : null,
      });

      if (result.error) {
        setSaveError(result.error);
        return;
      }

      const branch = branches.find((item) => item.id === Number(branchRaw));
      setDeal((current) =>
        current
          ? {
              ...current,
              amount,
              client_id: selectedClientId,
              branch_id: branchRaw ? Number(branchRaw) : null,
              client_name: selectedClientName,
              branch_name: branch?.name ?? null,
            }
          : current,
      );
      setSaveSuccess(true);
    });
  };

  if (!mounted) return null;

  return createPortal(
    <div className="crm-deal-panel-root" style={panelStyle} role="presentation">
      <aside
        className="crm-deal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-deal-panel-title"
      >
        <header className="crm-deal-panel-header">
          <div className="crm-deal-panel-header-main">
            {deal ? (
              <CrmDealHeaderTitle
                dealId={dealId}
                title={deal.title}
                pipelineId={activePipeline.id}
                disabled={isPending}
                onSave={handleTitleSave}
              />
            ) : (
              <h2 className="crm-deal-header-title">Сделка #{dealId}</h2>
            )}

            <CrmDealHeaderFunnelSelect
              pipelines={pipelines}
              activePipelineId={activePipeline.id}
              disabled={isPending || !deal}
              onSelect={handlePipelineChange}
            />
          </div>

          <div className="crm-deal-panel-header-actions">
            <button type="button" className="crm-deal-panel-close" onClick={onClose} aria-label="Закрыть">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <div className="crm-deal-stage-bar" role="tablist" aria-label="Этапы воронки">
          {stages.map((stage, index) => {
            const isActive = stage.id === deal?.stage_id;
            const isPast = activeStageIndex >= 0 && index < activeStageIndex;
            const isFirst = index === 0;
            const isLast = index === stages.length - 1;

            return (
              <button
                key={stage.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                disabled={isPending}
                className={[
                  "crm-deal-stage-step",
                  isFirst ? "crm-deal-stage-step--first" : "",
                  isLast ? "crm-deal-stage-step--last" : "",
                  isActive ? "crm-deal-stage-step--active" : "",
                  isPast ? "crm-deal-stage-step--past" : "",
                  stage.is_won ? "crm-deal-stage-step--won" : "",
                  stage.is_lost ? "crm-deal-stage-step--lost" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  isActive
                    ? ({ "--stage-accent": stage.color } as React.CSSProperties)
                    : undefined
                }
                onClick={() => handleStageClick(stage.id)}
              >
                <span className="crm-deal-stage-step-label">{stage.name}</span>
              </button>
            );
          })}
        </div>

        <div className="crm-deal-panel-tabs">
          <span className="crm-deal-panel-tab crm-deal-panel-tab--active">Общие</span>
          <span className="crm-deal-panel-tab crm-deal-panel-tab--disabled">Товары</span>
          <span className="crm-deal-panel-tab crm-deal-panel-tab--disabled">История</span>
        </div>

        {loadError ? (
          <div className="crm-deal-panel-alert crm-deal-panel-alert--error">{loadError}</div>
        ) : null}

        {!deal && !loadError ? (
          <div className="crm-deal-panel-loading">Загрузка карточки…</div>
        ) : null}

        {deal ? (
          <div className="crm-deal-panel-body">
            <section className="crm-deal-panel-main">
              <form key={`${deal.id}-${deal.title}-${deal.amount}-${deal.client_id}`} className="crm-deal-form" onSubmit={handleSubmit}>
                {saveError ? (
                  <div className="crm-deal-panel-alert crm-deal-panel-alert--error">{saveError}</div>
                ) : null}
                {saveSuccess ? (
                  <div className="crm-deal-panel-alert crm-deal-panel-alert--success">Сохранено</div>
                ) : null}

                {deal.linked_calls && deal.linked_calls.length > 0 ? (
                  <div className="crm-deal-section crm-deal-section--calls">
                    <h3 className="crm-deal-section-title">Звонки</h3>
                    <div className="crm-deal-calls-list">
                      {deal.linked_calls.map((call) => (
                        <CrmDealCallPlayer key={call.id} call={call} />
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="crm-deal-section">
                  <h3 className="crm-deal-section-title">О сделке</h3>

                  <div className="crm-deal-amount-block">
                    <label className="crm-deal-field crm-deal-field--amount">
                      <span className="crm-deal-field-label">Сумма</span>
                      <div className="crm-deal-amount-row">
                        <input
                          name="amount"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={deal.amount}
                          className="crm-deal-amount-input"
                        />
                        <span className="crm-deal-amount-currency">₽</span>
                      </div>
                      <span className="crm-deal-amount-hint">
                        {formatDealAmount(deal.amount)}
                      </span>
                    </label>
                    <button type="button" className="crm-deal-pay-btn" disabled>
                      Принять оплату
                    </button>
                  </div>

                  <div className="crm-deal-field crm-deal-field--readonly">
                    <span className="crm-deal-field-label">Стадия</span>
                    <span className="crm-deal-field-value">
                      <span
                        className="crm-deal-stage-dot"
                        style={{ background: deal.stage_color }}
                        aria-hidden="true"
                      />
                      {deal.stage_label}
                    </span>
                  </div>

                  <div className="crm-deal-field">
                    <span className="crm-deal-field-label">Клиент</span>
                    <CrmClientPicker
                      value={selectedClientId}
                      label={selectedClientName}
                      disabled={isPending}
                      onChange={(client) => {
                        setSelectedClientId(client?.id ?? null);
                        setSelectedClientName(client?.full_name ?? null);
                      }}
                    />
                    {!deal.client_id && !selectedClientId ? (
                      <CrmDealCreateClient
                        phone={deal.contact_phone ?? ""}
                        branches={branches}
                        branchId={deal.branch_id}
                        disabled={isPending}
                        onCreated={handleClientCreated}
                      />
                    ) : null}
                  </div>

                  <label className="crm-deal-field">
                    <span className="crm-deal-field-label">Филиал</span>
                    <select name="branch_id" defaultValue={deal.branch_id ?? ""} className="form-field">
                      <option value="">не заполнено</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="crm-deal-field">
                    <span className="crm-deal-field-label">Телефон</span>
                    <input
                      name="contact_phone"
                      type="text"
                      defaultValue={deal.contact_phone ?? ""}
                      className="form-field"
                      readOnly
                    />
                  </label>

                  {deal.lead_source_label ? (
                    <div className="crm-deal-field crm-deal-field--readonly">
                      <span className="crm-deal-field-label">Источник</span>
                      <span className="crm-deal-field-value">{deal.lead_source_label}</span>
                    </div>
                  ) : null}

                  {deal.days_remaining != null ? (
                    <div className="crm-deal-field crm-deal-field--readonly">
                      <span className="crm-deal-field-label">Дней до окончания</span>
                      <span className="crm-deal-field-value">{deal.days_remaining}</span>
                    </div>
                  ) : null}

                  {deal.membership_title ? (
                    <div className="crm-deal-field crm-deal-field--readonly">
                      <span className="crm-deal-field-label">Абонемент</span>
                      <span className="crm-deal-field-value">{deal.membership_title}</span>
                    </div>
                  ) : null}

                  <div className="crm-deal-field crm-deal-field--readonly">
                    <span className="crm-deal-field-label">Дата начала</span>
                    <span className="crm-deal-field-value">{formatDealDate(deal.created_at)}</span>
                  </div>
                </div>

                <div className="crm-deal-section">
                  <h3 className="crm-deal-section-title">Дополнительно</h3>

                  <div className="crm-deal-field crm-deal-field--readonly">
                    <span className="crm-deal-field-label">Тип</span>
                    <span className="crm-deal-field-value">Продажа абонемента</span>
                  </div>

                  <div className="crm-deal-field crm-deal-field--readonly">
                    <span className="crm-deal-field-label">Ответственный</span>
                    <span className="crm-deal-field-value">
                      {deal.assigned_to_name ?? "не назначен"}
                    </span>
                  </div>
                </div>

                <div className="crm-deal-form-actions">
                  <button type="submit" className="btn-primary" disabled={isPending}>
                    {isPending ? "Сохранение…" : "Сохранить"}
                  </button>
                  <button type="button" className="btn-secondary" onClick={onClose}>
                    Закрыть
                  </button>
                </div>
              </form>
            </section>

            <CrmDealPanelFeed
              deal={deal}
              disabled={isPending}
              onUpdated={(nextDeal) => setDeal(nextDeal)}
            />
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
