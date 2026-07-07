import type { DealStageRecord } from "@/lib/types";

export const STAGE_COLOR_PRESETS = [
  "#3d5f8f",
  "#4a90d9",
  "#2eb8d4",
  "#3dba5c",
  "#e8a020",
  "#9b59b6",
  "#e74c3c",
  "#8b98a8",
] as const;

export type StageTypeOption = "normal" | "won" | "lost";

export const STAGE_TYPE_OPTIONS: { value: StageTypeOption; label: string; hint: string }[] = [
  { value: "normal", label: "Обычный этап", hint: "Промежуточный шаг воронки" },
  { value: "won", label: "Успешное завершение", hint: "Сделка выиграна" },
  { value: "lost", label: "Отказ", hint: "Сделка проиграна" },
];

export function sortStages(stages: DealStageRecord[]): DealStageRecord[] {
  return [...stages].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export function defaultAfterStageId(stages: DealStageRecord[]): number | null {
  const sorted = sortStages(stages);
  const lastRegular = [...sorted].reverse().find((stage) => !stage.is_won && !stage.is_lost);
  return lastRegular?.id ?? sorted.at(-1)?.id ?? null;
}

export function moveStageInOrder(
  stages: DealStageRecord[],
  stageId: number,
  targetStageId: number,
): number[] {
  const ids = sortStages(stages).map((stage) => stage.id);
  const fromIndex = ids.indexOf(stageId);
  const toIndex = ids.indexOf(targetStageId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return ids;
  }
  ids.splice(fromIndex, 1);
  ids.splice(toIndex, 0, stageId);
  return ids;
}

export function moveStageByOffset(
  stages: DealStageRecord[],
  stageId: number,
  offset: -1 | 1,
): number[] {
  const ids = sortStages(stages).map((stage) => stage.id);
  const index = ids.indexOf(stageId);
  if (index < 0) return ids;
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= ids.length) return ids;
  [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
  return ids;
}
