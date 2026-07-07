"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createQuickDealAction, copyDealAction, deleteDealAction, updateDealStageAction } from "@/app/actions/deals";
import { reorderStagesAction } from "@/app/actions/pipelines";
import { CrmDealCardPanel } from "@/components/crm-deal-card-panel";
import { CrmKanbanAddStageColumn } from "@/components/crm-kanban-add-stage-column";
import { CrmKanbanColumnHeader } from "@/components/crm-kanban-column-header";
import { CrmKanbanContextMenu } from "@/components/crm-kanban-context-menu";
import { formatDealAmount } from "@/lib/crm-kanban";
import { moveStageInOrder } from "@/lib/pipeline-stages";
import type { BranchOption, ClientRecord, DealPipelineRecord, DealRecord } from "@/lib/types";

type CrmKanbanBoardProps = {
  pipeline: DealPipelineRecord;
  pipelines: DealPipelineRecord[];
  deals: DealRecord[];
  clients: ClientRecord[];
  branches: BranchOption[];
  initialDealId?: number;
};

export function CrmKanbanBoard({
  pipeline,
  pipelines,
  deals,
  clients,
  branches,
  initialDealId,
}: CrmKanbanBoardProps) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [draggingStageId, setDraggingStageId] = useState<number | null>(null);
  const [overStageId, setOverStageId] = useState<number | null>(null);
  const [openDealId, setOpenDealId] = useState<number | null>(initialDealId ?? null);
  const [contextMenu, setContextMenu] = useState<{ dealId: number; x: number; y: number } | null>(null);
  const [stageOverrides, setStageOverrides] = useState<Record<number, string>>({});
  const [isPending, startTransition] = useTransition();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const stages = useMemo(() => {
    return [...pipeline.stages]
      .map((stage) => ({
        ...stage,
        name: stageOverrides[stage.id] ?? stage.name,
      }))
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }, [pipeline.stages, stageOverrides]);

  const handleStageRenamed = (stageId: number, name: string) => {
    setStageOverrides((current) => ({ ...current, [stageId]: name }));
    router.refresh();
  };

  const openDeal = useMemo(
    () => (openDealId ? deals.find((deal) => deal.id === openDealId) : null),
    [deals, openDealId],
  );

  const dealsByStage = useMemo(() => {
    const grouped = Object.fromEntries(stages.map((stage) => [stage.id, [] as DealRecord[]]));

    for (const deal of deals) {
      if (grouped[deal.stage_id]) {
        grouped[deal.stage_id].push(deal);
      } else if (stages[0]) {
        grouped[stages[0].id].push(deal);
      }
    }

    return grouped;
  }, [deals, stages]);

  const columnTotals = useMemo(() => {
    return Object.fromEntries(
      stages.map((stage) => [
        stage.id,
        (dealsByStage[stage.id] ?? []).reduce((sum, deal) => sum + Number(deal.amount), 0),
      ]),
    );
  }, [dealsByStage, stages]);

  const handleDrop = (stageId: number, dealId: number) => {
    const deal = deals.find((item) => item.id === dealId);
    if (!deal || deal.stage_id === stageId) return;

    startTransition(async () => {
      try {
        await updateDealStageAction(dealId, stageId);
        router.refresh();
      } catch {
        router.refresh();
      }
    });
  };

  const handleQuickCreate = (stageId: number) => {
    startTransition(async () => {
      try {
        await createQuickDealAction(pipeline.id, stageId);
        router.refresh();
      } catch {
        router.refresh();
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
        setOpenDealId(result.dealId);
      }
      router.refresh();
    });
  };

  const handleDeleteFromMenu = () => {
    if (!contextMenu) return;
    const dealId = contextMenu.dealId;
    const deal = deals.find((item) => item.id === dealId);
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
      router.refresh();
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
                  dealsCount={columnDeals.length}
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
                      } ${openDealId === deal.id ? "crm-kanban-card--open" : ""}`}
                    >
                      <h3 className="crm-kanban-card-title">{deal.title}</h3>
                      <p className="crm-kanban-card-amount">{formatDealAmount(deal.amount)}</p>
                      {deal.client_name ? (
                        <p className="crm-kanban-card-client">{deal.client_name}</p>
                      ) : null}
                      {deal.assigned_to_name ? (
                        <p className="crm-kanban-card-meta">{deal.assigned_to_name}</p>
                      ) : null}
                    </article>
                  ))}

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
          clients={clients}
          branches={branches}
          preview={
            openDeal
              ? {
                  ...openDeal,
                  client_id: null,
                  branch_id: null,
                  assigned_to_id: null,
                  updated_at: openDeal.created_at,
                }
              : null
          }
          onClose={() => setOpenDealId(null)}
        />
      ) : null}
    </>
  );
}
