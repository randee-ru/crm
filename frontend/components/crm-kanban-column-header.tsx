"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { deleteStageAction, reorderStagesAction, updateStageNameAction } from "@/app/actions/pipelines";
import { formatDealAmount } from "@/lib/crm-kanban";
import { moveStageByOffset, sortStages } from "@/lib/pipeline-stages";
import type { DealStageRecord } from "@/lib/types";

type CrmKanbanColumnHeaderProps = {
  pipelineId: number;
  stage: DealStageRecord;
  stages: DealStageRecord[];
  dealsCount: number;
  totalAmount: number;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onRenamed?: (stageId: number, name: string) => void;
  onStagesChanged?: () => void;
  onStageDragStart?: (stageId: number) => void;
  onStageDragEnd?: () => void;
};

export function CrmKanbanColumnHeader({
  pipelineId,
  stage,
  stages,
  dealsCount,
  totalAmount,
  canMoveLeft,
  canMoveRight,
  onRenamed,
  onStagesChanged,
  onStageDragStart,
  onStageDragEnd,
}: CrmKanbanColumnHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(stage.name);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(stage.name);
  }, [stage.name]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointer = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };

    window.addEventListener("mousedown", handlePointer);
    return () => window.removeEventListener("mousedown", handlePointer);
  }, [menuOpen]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(stage.name);
      setEditing(false);
      return;
    }
    if (trimmed === stage.name) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await updateStageNameAction(pipelineId, stage.id, trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      onRenamed?.(stage.id, trimmed);
      setEditing(false);
    });
  };

  const handleMove = (offset: -1 | 1) => {
    setMenuOpen(false);
    const nextOrder = moveStageByOffset(sortStages(stages), stage.id, offset);
    startTransition(async () => {
      setError(null);
      const result = await reorderStagesAction(pipelineId, nextOrder);
      if (result.error) {
        setError(result.error);
        return;
      }
      onStagesChanged?.();
    });
  };

  const handleDelete = () => {
    setMenuOpen(false);
    if (dealsCount > 0) {
      setError("Сначала перенесите сделки в другой этап.");
      return;
    }
    if (!window.confirm(`Удалить этап «${stage.name}»?`)) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await deleteStageAction(pipelineId, stage.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onStagesChanged?.();
    });
  };

  return (
    <header className="crm-kanban-col-header" style={{ background: stage.color }}>
      <div className="crm-kanban-col-title-row">
        <button
          type="button"
          className="crm-kanban-col-drag"
          draggable={!isPending}
          aria-label={`Переместить колонку «${stage.name}»`}
          disabled={isPending}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/stage-id", String(stage.id));
            event.dataTransfer.effectAllowed = "move";
            onStageDragStart?.(stage.id);
          }}
          onDragEnd={() => onStageDragEnd?.()}
        >
          ⋮⋮
        </button>

        <div className="crm-kanban-col-title">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              disabled={isPending}
              className="crm-kanban-col-title-input"
              aria-label="Название этапа"
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => commit()}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") {
                  event.preventDefault();
                  commit();
                }
                if (event.key === "Escape") {
                  setDraft(stage.name);
                  setEditing(false);
                }
              }}
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <>
              <span className="crm-kanban-col-title-text">{stage.name}</span>
              <span className="crm-kanban-col-count">({dealsCount})</span>
              <button
                type="button"
                className="crm-kanban-col-edit"
                aria-label={`Переименовать этап «${stage.name}»`}
                disabled={isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  setEditing(true);
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current stroke-[1.8]">
                  <path
                    d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          )}
        </div>

        <div className="crm-kanban-col-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="crm-kanban-col-menu-btn"
            aria-label="Действия с этапом"
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((value) => !value);
            }}
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="crm-kanban-col-menu" role="menu">
              <button
                type="button"
                className="crm-kanban-col-menu-item"
                disabled={!canMoveLeft || isPending}
                onClick={() => handleMove(-1)}
              >
                Переместить влево
              </button>
              <button
                type="button"
                className="crm-kanban-col-menu-item"
                disabled={!canMoveRight || isPending}
                onClick={() => handleMove(1)}
              >
                Переместить вправо
              </button>
              <button
                type="button"
                className="crm-kanban-col-menu-item crm-kanban-col-menu-item--danger"
                disabled={isPending || stages.length <= 1}
                onClick={handleDelete}
              >
                Удалить этап
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="crm-kanban-col-sum">{formatDealAmount(totalAmount)}</div>
      {error ? <p className="crm-kanban-col-error">{error}</p> : null}
    </header>
  );
}
