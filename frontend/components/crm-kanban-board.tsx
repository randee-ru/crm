"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createQuickDealAction, copyDealAction, deleteDealAction, getDealAction, loadKanbanStageDealsAction, updateDealStageAction } from "@/app/actions/deals";
import { reorderStagesAction } from "@/app/actions/pipelines";
import { CrmDealCardPanel } from "@/components/crm-deal-card-panel";
import { CrmKanbanAddStageColumn } from "@/components/crm-kanban-add-stage-column";
import { CrmKanbanColumnHeader } from "@/components/crm-kanban-column-header";
import { CrmKanbanContextMenu } from "@/components/crm-kanban-context-menu";
import { formatDealAmount, formatKanbanCardCreatedAt } from "@/lib/crm-kanban";
import { filterCanonicalStages } from "@/lib/crm-pipelines";
import { moveStageInOrder } from "@/lib/pipeline-stages";
import type { BranchOption, DealPipelineRecord, DealRecord } from "@/lib/types";

type CrmKanbanBoardProps = {
  pipeline: DealPipelineRecord;
  pipelines: DealPipelineRecord[];
  deals: DealRecord[];
  branches: BranchOption[];
  perStage?: number;
  search?: string;
  initialDealId?: number;
};

export function CrmKanbanBoard({
  pipeline,
  pipelines,
  deals: initialDeals,
  branches,
  perStage = 15,
  search,
  initialDealId,
}: CrmKanbanBoardProps) {
  const router = useRouter();
  const [dealRows, setDealRows] = useState(initialDeals);
  const [loadingStages, setLoadingStages] = useState<Record<number, boolean>>({});
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [draggingStageId, setDraggingStageId] = useState<number | null>(null);
  const [overStageId, setOverStageId] = useState<number | null>(null);
  const [openDealId, setOpenDealId] = useState<number | null>(initialDealId ?? null);
  const [contextMenu, setContextMenu] = useState<{ dealId: number; x: number; y: number } | null>(null);
  const [stageOverrides, setStageOverrides] = useState<Record<number, string>>({});
  const [isPending, startTransition] = useTransition();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setDealRows(initialDeals);
  }, [initialDeals]);

  const stages = useMemo(() => {
    return filterCanonicalStages(pipeline.slug, pipeline.stages)
      .map((stage) => ({
        ...stage,
        name: stageOverrides[stage.id] ?? stage.name,
      }))
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }, [pipeline.slug, pipeline.stages, stageOverrides]);

  const handleStageRenamed = (stageId: number, name: string) => {
    setStageOverrides((current) => ({ ...current, [stageId]: name }));
  };

  const openDeal = useMemo(
    () => (openDealId ? dealRows.find((deal) => deal.id === openDealId) : null),
    [dealRows, openDealId],
  );

  const dealsByStage = useMemo(() => {
    const grouped = Object.fromEntries(stages.map((stage) => [stage.id, [] as DealRecord[]]));

    for (const deal of dealRows) {
      if (grouped[deal.stage_id]) {
        grouped[deal.stage_id].push(deal);
      } else if (stages[0]) {
        grouped[stages[0].id].push(deal);
      }
    }

    return grouped;
  }, [dealRows, stages]);

  const columnTotals = useMemo(() => {
    return Object.fromEntries(
      stages.map((stage) => [
        stage.id,
        (dealsByStage[stage.id] ?? []).reduce((sum, deal) => sum + Number(deal.amount), 0),
      ]),
    );
  }, [dealsByStage, stages]);

  const handleDrop = (stageId: number, dealId: number) => {
    const deal = dealRows.find((item) => item.id === dealId);
    const targetStage = stages.find((stage) => stage.id === stageId);
    if (!deal || deal.stage_id === stageId || !targetStage) return;

    const applyLocalMove = (extra?: { loss_reason?: string }) => {
      const previous = dealRows;
      setDealRows((current) =>
        current.map((item) =>
          item.id === dealId
            ? {
                ...item,
                stage_id: stageId,
                stage_label: targetStage.name,
                stage_code: targetStage.code,
                stage_color: targetStage.color,
                loss_reason: extra?.loss_reason ?? item.loss_reason,
              }
            : item,
        ),
      );

      startTransition(async () => {
        try {
          if (extra?.loss_reason) {
            const { updateDealAction } = await import("@/app/actions/deals");
            await updateDealAction(dealId, { stage_id: stageId, loss_reason: extra.loss_reason });
          } else {
            await updateDealStageAction(dealId, stageId);
          }
        } catch {
          setDealRows(previous);
        }
      });
    };

    if (targetStage?.is_lost && !deal.loss_reason) {
      const reason = window.prompt(
        "Укажите причину отказа (expensive, other_club, far, no_time, no_answer, changed_mind, club_dislike, no_visit, other):",
      );
      if (!reason) return;
      applyLocalMove({ loss_reason: reason });
      return;
    }

    applyLocalMove();
  };

  const handleQuickCreate = (stageId: number) => {
    startTransition(async () => {
      try {
        const created = await createQuickDealAction(pipeline.id, stageId);
        setDealRows((current) => [created, ...current]);
      } catch {
        router.refresh();
      }
    });
  };

  const handleLoadMore = (stageId: number, loadAll = false) => {
    const stage = stages.find((item) => item.id === stageId);
    const total = stage?.deals_count ?? 0;
    const loaded = (dealsByStage[stageId] ?? []).length;
    if (loaded >= total) return;

    setLoadingStages((current) => ({ ...current, [stageId]: true }));

    startTransition(async () => {
      try {
        let offset = loaded;
        while (offset < total) {
          const batchSize = loadAll ? 50 : perStage;
          const more = await loadKanbanStageDealsAction(pipeline.id, stageId, offset, search, batchSize);
          if (!more.length) break;

          setDealRows((current) => {
            const existingIds = new Set(current.map((deal) => deal.id));
            const merged = [...current];
            for (const deal of more) {
              if (!existingIds.has(deal.id)) merged.push(deal);
            }
            return merged;
          });

          offset += more.length;
          if (!loadAll || more.length < batchSize) break;
        }
      } finally {
        setLoadingStages((current) => ({ ...current, [stageId]: false }));
      }
    });
  };

  const handleCardClick = (dealId: number, event: React.MouseEvent) => {
    if (pointerStart.current) {
      const dx = Math.abs(event.clientX - pointerStart.current.x);
      const dy = Math.abs(event.clientY - pointerStart.current.y);
      if (dx > 6 || dy > 6) return;
    }
    setOpenDealId(dealId);
  };

  const handleCardContextMenu = (dealId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ dealId, x: event.clientX, y: event.clientY });
  };

  const handleEditFromMenu = () => {
    if (!contextMenu) return;
    setOpenDealId(contextMenu.dealId);
    setContextMenu(null);
  };

  const handleCopyFromMenu = () => {
    if (!contextMenu) return;
    const dealId = contextMenu.dealId;
    setContextMenu(null);

    startTransition(async () => {
      const result = await copyDealAction(dealId);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      if (result.dealId) {
        try {
          const copied = await getDealAction(result.dealId);
          setDealRows((current) => [copied, ...current]);
          setOpenDealId(result.dealId);
        } catch {
          window.alert("Сделка скопирована, но не удалось загрузить карточку.");
        }
      }
    });
  };

  const handleDeleteFromMenu = () => {
    if (!contextMenu) return;
    const dealId = contextMenu.dealId;
    const deal = dealRows.find((item) => item.id === dealId);
    const title = deal?.title ?? "сделку";
    setContextMenu(null);

    if (!window.confirm(`Удалить «${title}»? Это действие нельзя отменить.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteDealAction(dealId);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      if (openDealId === dealId) {
        setOpenDealId(null);
      }
      setDealRows((current) => current.filter((item) => item.id !== dealId));
    });
  };

  const handleStageReorderDrop = (targetStageId: number) => {
    if (!draggingStageId || draggingStageId === targetStageId) return;

    const nextOrder = moveStageInOrder(stages, draggingStageId, targetStageId);
    startTransition(async () => {
      const result = await reorderStagesAction(pipeline.id, nextOrder);
      if (result.error) {
        window.alert(result.error);
      }
      router.refresh();
    });
  };

  return (
    <>
      <div className={`crm-kanban-board ${isPending ? "crm-kanban-board--pending" : ""}`}>
        <div className="crm-kanban-scroll">
          {stages.map((stage, index) => {
            const columnDeals = dealsByStage[stage.id] ?? [];
            const isOver = overStageId === stage.id;
            const isStageDragOver = isOver && draggingStageId !== null;

            return (
              <section
                key={stage.id}
                className={`crm-kanban-column ${isOver ? "crm-kanban-column--over" : ""} ${
                  isStageDragOver ? "crm-kanban-column--stage-over" : ""
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverStageId(stage.id);
                }}
                onDragLeave={() => setOverStageId(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setOverStageId(null);

                  const stageRaw = event.dataTransfer.getData("text/stage-id");
                  const draggedStageId = Number(stageRaw);
                  if (draggedStageId) {
                    handleStageReorderDrop(stage.id);
                    setDraggingStageId(null);
                    return;
                  }

                  const dealRaw = event.dataTransfer.getData("text/deal-id");
                  const dealId = Number(dealRaw);
                  if (dealId) handleDrop(stage.id, dealId);
                }}
              >
                <CrmKanbanColumnHeader
                  pipelineId={pipeline.id}
                  stage={stage}
                  stages={stages}
                  dealsCount={stage.deals_count ?? columnDeals.length}
                  loadedCount={columnDeals.length}
                  totalAmount={columnTotals[stage.id] ?? 0}
                  canMoveLeft={index > 0}
                  canMoveRight={index < stages.length - 1}
                  onRenamed={handleStageRenamed}
                  onStagesChanged={() => router.refresh()}
                  onStageDragStart={setDraggingStageId}
                  onStageDragEnd={() => {
                    setDraggingStageId(null);
                    setOverStageId(null);
                  }}
                />

                <div className="crm-kanban-col-body">
                  <button
                    type="button"
                    className="crm-kanban-quick-add"
                    onClick={() => handleQuickCreate(stage.id)}
                    disabled={isPending}
                  >
                    + Быстрая сделка
                  </button>

                  {columnDeals.map((deal) => (
                    <article
                      key={deal.id}
                      draggable
                      onPointerDown={(event) => {
                        pointerStart.current = { x: event.clientX, y: event.clientY };
                      }}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/deal-id", String(deal.id));
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingId(deal.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverStageId(null);
                      }}
                      onClick={(event) => handleCardClick(deal.id, event)}
                      onContextMenu={(event) => handleCardContextMenu(deal.id, event)}
                      className={`crm-kanban-card ${
                        draggingId === deal.id ? "crm-kanban-card--dragging" : ""
                      } ${openDealId === deal.id ? "crm-kanban-card--open" : ""} ${
                        deal.has_overdue_task ? "crm-kanban-card--overdue" : ""
                      }`}
                    >
                      <div className="crm-kanban-card-body">
                        <h3 className="crm-kanban-card-title">{deal.client_name || deal.title}</h3>
                        {deal.contact_phone ? (
                          <p className="crm-kanban-card-phone">{deal.contact_phone}</p>
                        ) : null}
                        <div className="crm-kanban-card-row">
                          {deal.lead_source_label ? (
                            <span className="crm-kanban-card-badge">{deal.lead_source_label}</span>
                          ) : null}
                          {deal.pipeline_slug === "membership-renewal" && deal.days_remaining != null ? (
                            <span
                              className={`crm-kanban-card-days ${
                                deal.days_remaining <= 3 ? "crm-kanban-card-days--urgent" : ""
                              }`}
                            >
                              {deal.days_remaining} дн.
                            </span>
                          ) : null}
                        </div>
                        {deal.next_contact_at ? (
                          <p className="crm-kanban-card-meta">
                            Контакт: {new Date(deal.next_contact_at).toLocaleDateString("ru-RU")}
                          </p>
                        ) : null}
                        {deal.assigned_to_name ? (
                          <p className="crm-kanban-card-meta">{deal.assigned_to_name}</p>
                        ) : null}
                      </div>
                      <div className="crm-kanban-card-footer">
                        <p className="crm-kanban-card-amount">{formatDealAmount(deal.amount)}</p>
                        {deal.created_at ? (
                          <time className="crm-kanban-card-created" dateTime={deal.created_at}>
                            {formatKanbanCardCreatedAt(deal.created_at)}
                          </time>
                        ) : null}
                      </div>
                    </article>
                  ))}

                  {columnDeals.length > 0 &&
                  columnDeals.length < (stage.deals_count ?? columnDeals.length) ? (
                    <div className="crm-kanban-load-more-group">
                      <button
                        type="button"
                        className="crm-kanban-load-more"
                        disabled={Boolean(loadingStages[stage.id]) || isPending}
                        onClick={() => handleLoadMore(stage.id)}
                      >
                        {loadingStages[stage.id]
                          ? "Загрузка…"
                          : `Ещё ${Math.min(perStage, (stage.deals_count ?? 0) - columnDeals.length)}`}
                      </button>
                      {(stage.deals_count ?? 0) - columnDeals.length > perStage ? (
                        <button
                          type="button"
                          className="crm-kanban-load-all"
                          disabled={Boolean(loadingStages[stage.id]) || isPending}
                          onClick={() => handleLoadMore(stage.id, true)}
                        >
                          Загрузить все ({stage.deals_count})
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {columnDeals.length === 0 ? (
                    <p className="crm-kanban-empty">Перетащите сделку сюда</p>
                  ) : null}
                </div>
              </section>
            );
          })}

          <CrmKanbanAddStageColumn pipelineId={pipeline.id} stages={stages} />
        </div>
      </div>

      {contextMenu ? (
        <CrmKanbanContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          busy={isPending}
          onClose={() => setContextMenu(null)}
          onEdit={handleEditFromMenu}
          onCopy={handleCopyFromMenu}
          onDelete={handleDeleteFromMenu}
        />
      ) : null}

      {openDealId ? (
        <CrmDealCardPanel
          dealId={openDealId}
          pipeline={pipeline}
          pipelines={pipelines}
          branches={branches}
          preview={openDeal ? { ...openDeal, updated_at: openDeal.created_at } : null}
          onClose={() => setOpenDealId(null)}
        />
      ) : null}
    </>
  );
}
