"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createPipelineAction, createStageAction } from "@/app/actions/pipelines";
import { PipelineStageForm } from "@/components/pipeline-stage-form";
import { SettingsPipelineStageList } from "@/components/settings/settings-pipeline-stage-list";
import { defaultAfterStageId } from "@/lib/pipeline-stages";
import type { DealPipelineRecord } from "@/lib/types";

type SettingsPipelinesSectionProps = {
  initialPipelines: DealPipelineRecord[];
};

function SettingsPipelineItem({
  pipeline,
  disabled,
  onStageCreated,
  onStageError,
}: {
  pipeline: DealPipelineRecord;
  disabled: boolean;
  onStageCreated: (message: string) => void;
  onStageError: (message: string) => void;
}) {
  const router = useRouter();
  const [showStageForm, setShowStageForm] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreateStage = (input: {
    name: string;
    stageType: "normal" | "won" | "lost";
    color: string;
    afterStageId: number | null;
  }) => {
    setStageError(null);

    startTransition(async () => {
      const result = await createStageAction({
        pipelineId: pipeline.id,
        name: input.name,
        stageType: input.stageType,
        color: input.color,
        afterStageId: input.afterStageId ?? defaultAfterStageId(pipeline.stages),
      });

      if (result.error) {
        setStageError(result.error);
        onStageError(result.error);
        return;
      }

      setShowStageForm(false);
      onStageCreated(`Этап «${input.name.trim()}» добавлен в воронку «${pipeline.name}».`);
      router.refresh();
    });
  };

  return (
    <details className="settings-pipeline-item" open={pipeline.is_default}>
      <summary className="settings-pipeline-summary">
        <span className="settings-pipeline-name">{pipeline.name}</span>
        <span className="settings-pipeline-meta">
          {pipeline.slug}
          {pipeline.is_default ? " · по умолчанию" : ""}
        </span>
      </summary>

      <SettingsPipelineStageList
        pipelineId={pipeline.id}
        stages={pipeline.stages}
        disabled={disabled || isPending}
        onMessage={onStageCreated}
        onError={(message) => {
          setStageError(message);
          onStageError(message);
        }}
      />

      <div className="settings-pipeline-stages-actions">
        {showStageForm ? (
          <div className="settings-stage-create-panel">
            <h3 className="settings-stage-create-title">Новый этап воронки</h3>
            {stageError ? <p className="settings-form-error">{stageError}</p> : null}
            <PipelineStageForm
              stages={pipeline.stages}
              disabled={disabled || isPending}
              submitLabel={isPending ? "Добавляем…" : "Добавить этап"}
              onCancel={() => {
                setShowStageForm(false);
                setStageError(null);
              }}
              onSubmit={handleCreateStage}
            />
          </div>
        ) : (
          <button
            type="button"
            className="settings-add-stage-btn"
            disabled={disabled || isPending}
            onClick={() => setShowStageForm(true)}
          >
            + Добавить этап
          </button>
        )}
      </div>
    </details>
  );
}

export function SettingsPipelinesSection({ initialPipelines }: SettingsPipelinesSectionProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    setStatus("Обновляем список воронок…");
    router.refresh();
    setStatus("Список воронок обновлён.");
  };

  const handleCreate = (formData: FormData) => {
    setError(null);
    setStatus(null);

    startTransition(async () => {
      const result = await createPipelineAction({
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? "") || undefined,
        isDefault: formData.get("is_default") === "on",
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setShowForm(false);
      setStatus("Воронка создана с типовыми этапами продаж.");
      router.refresh();
    });
  };

  return (
    <div className="settings-card">
      <div className="settings-card-head">
        <div>
          <h2 className="settings-card-title">Воронки продаж</h2>
          <p className="settings-card-desc">
            Настройте этапы канбана: добавляйте любые промежуточные шаги, этапы успеха и отказа.
            Новая колонка сразу появится на канбане CRM.
          </p>
        </div>
        <div className="settings-card-head-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setShowForm((value) => !value);
              setError(null);
            }}
          >
            {showForm ? "Отмена" : "+ Добавить воронку"}
          </button>
          <button type="button" className="btn-secondary" onClick={refresh}>
            Обновить
          </button>
        </div>
      </div>

      {showForm ? (
        <form action={handleCreate} className="settings-pipeline-create-form">
          <label className="settings-field">
            <span className="settings-field-label">Название</span>
            <input
              name="name"
              type="text"
              required
              maxLength={120}
              placeholder="Например, Корпоративные продажи"
              className="settings-field-input"
              disabled={isPending}
            />
          </label>

          <label className="settings-field">
            <span className="settings-field-label">Код (необязательно)</span>
            <input
              name="slug"
              type="text"
              maxLength={80}
              placeholder="corporate-sales"
              pattern="[a-z0-9-]*"
              className="settings-field-input"
              disabled={isPending}
            />
            <span className="settings-field-hint">
              Латиница и дефисы. Если оставить пустым — код сгенерируется из названия.
            </span>
          </label>

          <label className="settings-checkbox-field">
            <input name="is_default" type="checkbox" disabled={isPending} />
            <span>Сделать воронкой по умолчанию</span>
          </label>

          {error ? <p className="settings-form-error">{error}</p> : null}

          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? "Создаём…" : "Создать воронку"}
          </button>
        </form>
      ) : null}

      {status ? <p className="settings-status-text">{status}</p> : null}

      <div className="settings-pipelines-list">
        {initialPipelines.length === 0 ? (
          <p className="settings-empty-text">Воронок пока нет. Создайте первую воронку продаж.</p>
        ) : (
          initialPipelines.map((pipeline) => (
            <SettingsPipelineItem
              key={pipeline.id}
              pipeline={pipeline}
              disabled={isPending}
              onStageCreated={setStatus}
              onStageError={setStatus}
            />
          ))
        )}
      </div>

      <p className="settings-hint">
        Перетаскивайте этапы за ручку ⋮⋮ или используйте стрелки ↑↓. Удаление возможно только если
        в этапе нет сделок. На канбане колонки тоже можно перемещать и удалять через меню ⋯.
      </p>
    </div>
  );
}
