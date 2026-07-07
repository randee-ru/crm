"use client";

import { useState } from "react";

import type { StageType } from "@/app/actions/pipelines";
import {
  STAGE_COLOR_PRESETS,
  STAGE_TYPE_OPTIONS,
  type StageTypeOption,
} from "@/lib/pipeline-stages";
import type { DealStageRecord } from "@/lib/types";

type PipelineStageFormProps = {
  stages?: DealStageRecord[];
  showPosition?: boolean;
  compact?: boolean;
  submitLabel?: string;
  disabled?: boolean;
  onSubmit: (input: {
    name: string;
    stageType: StageType;
    color: string;
    afterStageId: number | null;
  }) => void;
  onCancel?: () => void;
};

export function PipelineStageForm({
  stages = [],
  showPosition = true,
  compact = false,
  submitLabel = "Добавить этап",
  disabled = false,
  onSubmit,
  onCancel,
}: PipelineStageFormProps) {
  const [name, setName] = useState("");
  const [stageType, setStageType] = useState<StageTypeOption>("normal");
  const [color, setColor] = useState<string>(STAGE_COLOR_PRESETS[1]);
  const [afterStageId, setAfterStageId] = useState<string>("");

  const sortedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      name,
      stageType,
      color,
      afterStageId: afterStageId ? Number(afterStageId) : null,
    });
  };

  return (
    <form
      className={compact ? "pipeline-stage-form pipeline-stage-form--compact" : "pipeline-stage-form"}
      onSubmit={handleSubmit}
    >
      <label className="pipeline-stage-form-field">
        <span className="pipeline-stage-form-label">Название этапа</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Например, Согласование договора"
          className="pipeline-stage-form-input"
          maxLength={120}
          required
          disabled={disabled}
        />
      </label>

      <fieldset className="pipeline-stage-form-field">
        <legend className="pipeline-stage-form-label">Тип этапа</legend>
        <div className="pipeline-stage-type-grid">
          {STAGE_TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`pipeline-stage-type-option ${
                stageType === option.value ? "pipeline-stage-type-option--active" : ""
              }`}
            >
              <input
                type="radio"
                name="stageType"
                value={option.value}
                checked={stageType === option.value}
                onChange={() => setStageType(option.value)}
                disabled={disabled}
              />
              <span className="pipeline-stage-type-title">{option.label}</span>
              {!compact ? <span className="pipeline-stage-type-hint">{option.hint}</span> : null}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="pipeline-stage-form-field">
        <legend className="pipeline-stage-form-label">Цвет колонки</legend>
        <div className="pipeline-stage-color-grid">
          {STAGE_COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`pipeline-stage-color-swatch ${
                color === preset ? "pipeline-stage-color-swatch--active" : ""
              }`}
              style={{ background: preset }}
              aria-label={`Цвет ${preset}`}
              disabled={disabled}
              onClick={() => setColor(preset)}
            />
          ))}
        </div>
      </fieldset>

      {showPosition && sortedStages.length > 0 ? (
        <label className="pipeline-stage-form-field">
          <span className="pipeline-stage-form-label">Вставить после</span>
          <select
            value={afterStageId}
            onChange={(event) => setAfterStageId(event.target.value)}
            className="pipeline-stage-form-input"
            disabled={disabled}
          >
            <option value="">Перед этапами «Успех» и «Отказ»</option>
            {sortedStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="pipeline-stage-form-actions">
        {onCancel ? (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={disabled}>
            Отмена
          </button>
        ) : null}
        <button type="submit" className="btn-primary" disabled={disabled || !name.trim()}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
