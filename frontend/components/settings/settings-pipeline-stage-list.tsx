"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteStageAction, reorderStagesAction } from "@/app/actions/pipelines";
import { IconArrowDown, IconArrowUp, IconClose, IconGrip } from "@/components/ui/app-icon";
import { moveStageByOffset, moveStageInOrder, sortStages } from "@/lib/pipeline-stages";
import type { DealStageRecord } from "@/lib/types";

type SettingsPipelineStageListProps = {
  pipelineId: number;
  stages: DealStageRecord[];
  disabled?: boolean;
  onMessage?: (message: string) => void;
  onError?: (message: string) => void;
};

export function SettingsPipelineStageList({
  pipelineId,
  stages,
  disabled = false,
  onMessage,
  onError,
}: SettingsPipelineStageListProps) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedStages = sortStages(stages);

  const applyReorder = (stageIds: number[], successMessage?: string) => {
    startTransition(async () => {
      const result = await reorderStagesAction(pipelineId, stageIds);
      if (result.error) {
        onError?.(result.error);
        return;
      }
      if (successMessage) {
        onMessage?.(successMessage);
      }
      router.refresh();
    });
  };

  const handleDelete = (stage: DealStageRecord) => {
    const dealsCount = stage.deals_count ?? 0;
    if (dealsCount > 0) {
      onError?.("Сначала перенесите сделки в другой этап.");
      return;
    }

    if (!window.confirm(`Удалить этап «${stage.name}»?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteStageAction(pipelineId, stage.id);
      if (result.error) {
        onError?.(result.error);
        return;
      }
      onMessage?.(`Этап «${stage.name}» удалён.`);
      router.refresh();
    });
  };

  const handleMove = (stageId: number, offset: -1 | 1) => {
    const nextOrder = moveStageByOffset(sortedStages, stageId, offset);
    applyReorder(nextOrder);
  };

  const handleDrop = (targetStageId: number) => {
    if (draggingId === null || draggingId === targetStageId) {
      setDraggingId(null);
      setOverId(null);
      return;
    }

    const nextOrder = moveStageInOrder(sortedStages, draggingId, targetStageId);
    setDraggingId(null);
    setOverId(null);
    applyReorder(nextOrder, "Порядок этапов обновлён.");
  };

  return (
    <ol className="settings-stage-list settings-stage-list--sortable">
      {sortedStages.map((stage, index) => {
        const isDragging = draggingId === stage.id;
        const isOver = overId === stage.id && draggingId !== stage.id;

        return (
          <li
            key={stage.id}
            className={`settings-stage-item settings-stage-item--sortable ${
              isDragging ? "settings-stage-item--dragging" : ""
            } ${isOver ? "settings-stage-item--over" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setOverId(stage.id);
            }}
            onDragLeave={() => setOverId(null)}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(stage.id);
            }}
          >
            <button
              type="button"
              className="settings-stage-drag-handle"
              draggable={!disabled && !isPending}
              aria-label={`Переместить этап «${stage.name}»`}
              disabled={disabled || isPending}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/stage-id", String(stage.id));
                event.dataTransfer.effectAllowed = "move";
                setDraggingId(stage.id);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setOverId(null);
              }}
            >
              <IconGrip size={14} />
            </button>

            <span className="settings-stage-color" style={{ background: stage.color }} aria-hidden="true" />
            <span className="settings-stage-name">{stage.name}</span>
            <span className="settings-stage-code">{stage.code}</span>
            {stage.is_won ? <span className="settings-stage-badge">успех</span> : null}
            {stage.is_lost ? <span className="settings-stage-badge">отказ</span> : null}
            {typeof stage.deals_count === "number" ? (
              <span className="settings-stage-count">{stage.deals_count} сделок</span>
            ) : null}

            <div className="settings-stage-item-actions">
              <button
                type="button"
                className="settings-stage-action-btn"
                aria-label="Переместить вверх"
                disabled={disabled || isPending || index === 0}
                onClick={() => handleMove(stage.id, -1)}
              >
                <IconArrowUp size={14} />
              </button>
              <button
                type="button"
                className="settings-stage-action-btn"
                aria-label="Переместить вниз"
                disabled={disabled || isPending || index === sortedStages.length - 1}
                onClick={() => handleMove(stage.id, 1)}
              >
                <IconArrowDown size={14} />
              </button>
              <button
                type="button"
                className="settings-stage-action-btn settings-stage-action-btn--danger"
                aria-label={`Удалить этап «${stage.name}»`}
                disabled={disabled || isPending || sortedStages.length <= 1}
                onClick={() => handleDelete(stage)}
              >
                <IconClose size={14} />
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
