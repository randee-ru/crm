"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { getDealAction, updateDealAction, updateDealStageAction } from "@/app/actions/deals";
import {
  CrmDealHeaderFunnelSelect,
  CrmDealHeaderTitle,
} from "@/components/crm-deal-panel-header";
import { useWorkspaceShell } from "@/components/workspace-shell-provider";
import { formatClientDate, formatDateTime } from "@/lib/api";
import { formatDealAmount } from "@/lib/crm-kanban";
import type { BranchOption, ClientRecord, DealDetail, DealPipelineRecord } from "@/lib/types";

type CrmDealCardPanelProps = {
  dealId: number;
  pipeline: DealPipelineRecord;
  pipelines: DealPipelineRecord[];
  clients: ClientRecord[];
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
  clients,
  branches,
  preview,
  onClose,
}: CrmDealCardPanelProps) {
  const router = useRouter();
  const { sidebarCollapsed } = useWorkspaceShell();
  const [mounted, setMounted] = useState(false);
  const [deal, setDeal] = useState<DealDetail | null>(preview ?? null);
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

  const loadDeal = useCallback(async () => {
    setLoadError(null);
    try {
      const detail = await getDealAction(dealId);
      setDeal(detail);
    } catch {
      setLoadError("Не удалось загрузить сделку.");
    }
  }, [dealId]);

  useEffect(() => {
    void loadDeal();
  }, [loadDeal]);

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
        router.refresh();
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
    router.refresh();
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
      router.refresh();
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!deal) return;

    const formData = new FormData(event.currentTarget);
    const amount = String(formData.get("amount") ?? "0");
    const clientRaw = String(formData.get("client_id") ?? "");
    const branchRaw = String(formData.get("branch_id") ?? "");

    startTransition(async () => {
      setSaveError(null);
      setSaveSuccess(false);
      const result = await updateDealAction(deal.id, {
        title: deal.title,
        amount,
        client_id: clientRaw ? Number(clientRaw) : null,
        branch_id: branchRaw ? Number(branchRaw) : null,
      });

      if (result.error) {
        setSaveError(result.error);
        return;
      }

      const client = clients.find((item) => item.id === Number(clientRaw));
      const branch = branches.find((item) => item.id === Number(branchRaw));
      setDeal((current) =>
        current
          ? {
              ...current,
              amount,
              client_id: clientRaw ? Number(clientRaw) : null,
              branch_id: branchRaw ? Number(branchRaw) : null,
              client_name: client?.full_name ?? null,
              branch_name: branch?.name ?? null,
            }
          : current,
      );
      setSaveSuccess(true);
      router.refresh();
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

                  <label className="crm-deal-field">
                    <span className="crm-deal-field-label">Клиент</span>
                    <select
                      name="client_id"
                      defaultValue={deal.client_id ?? ""}
                      className="form-field"
                    >
                      <option value="">не заполнено</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.full_name}
                        </option>
                      ))}
                    </select>
                  </label>

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

            <aside className="crm-deal-panel-feed">
              <div className="crm-deal-feed-tabs">
                <button type="button" className="crm-deal-feed-tab crm-deal-feed-tab--active">
                  Дело
                </button>
                <button type="button" className="crm-deal-feed-tab" disabled>
                  Комментарий
                </button>
                <button type="button" className="crm-deal-feed-tab" disabled>
                  Задача
                </button>
              </div>

              <div className="crm-deal-feed-compose">
                <input
                  type="text"
                  placeholder="Что нужно сделать"
                  className="crm-deal-feed-input"
                  disabled
                />
                <p className="crm-deal-feed-hint">Задачи и комментарии — на следующем этапе</p>
              </div>

              <div className="crm-deal-feed-promo">
                <strong>Создайте дело</strong>
                <p>Запланируйте следующий шаг с клиентом: звонок, пробное занятие или напоминание об оплате.</p>
                <button type="button" className="crm-deal-feed-promo-btn" disabled>
                  Создать дело
                </button>
              </div>

              <ol className="crm-deal-timeline">
                {deal.updated_at !== deal.created_at ? (
                  <li className="crm-deal-timeline-item">
                    <span className="crm-deal-timeline-time">{formatDateTime(deal.updated_at)}</span>
                    <span className="crm-deal-timeline-text">Сделка обновлена</span>
                  </li>
                ) : null}
                <li className="crm-deal-timeline-item">
                  <span className="crm-deal-timeline-time">{formatDateTime(deal.created_at)}</span>
                  <span className="crm-deal-timeline-text">Создана сделка</span>
                </li>
              </ol>
            </aside>
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
