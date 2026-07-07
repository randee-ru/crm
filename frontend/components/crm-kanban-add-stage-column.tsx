"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createStageAction } from "@/app/actions/pipelines";
import { PipelineStageForm } from "@/components/pipeline-stage-form";
import { defaultAfterStageId } from "@/lib/pipeline-stages";
import type { DealStageRecord } from "@/lib/types";

type CrmKanbanAddStageColumnProps = {
  pipelineId: number;
  stages: DealStageRecord[];
};

export function CrmKanbanAddStageColumn({ pipelineId, stages }: CrmKanbanAddStageColumnProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (input: {
    name: string;
    stageType: "normal" | "won" | "lost";
    color: string;
    afterStageId: number | null;
  }) => {
    setError(null);

    startTransition(async () => {
      const result = await createStageAction({
        pipelineId,
        name: input.name,
        stageType: input.stageType,
        color: input.color,
        afterStageId: input.afterStageId ?? defaultAfterStageId(stages),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  };

  return (
    <section className="crm-kanban-add-column">
      {open ? (
        <div className="crm-kanban-add-column-panel">
          <h3 className="crm-kanban-add-column-title">Новый этап</h3>
          <p className="crm-kanban-add-column-desc">
            Добавьте любой этап воронки — не только «Отказ» или «Успех».
          </p>
          {error ? <p className="crm-kanban-add-column-error">{error}</p> : null}
          <PipelineStageForm
            stages={stages}
            showPosition={false}
            compact
            submitLabel={isPending ? "Добавляем…" : "Добавить"}
            disabled={isPending}
            onCancel={() => {
              setOpen(false);
              setError(null);
            }}
            onSubmit={handleSubmit}
          />
        </div>
      ) : (
        <button
          type="button"
          className="crm-kanban-add-column-trigger"
          onClick={() => setOpen(true)}
        >
          <span className="crm-kanban-add-column-plus">+</span>
          <span>Добавить этап</span>
        </button>
      )}
    </section>
  );
}
