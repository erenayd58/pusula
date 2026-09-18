import { planItemKindLabels } from "@/content/labels";
import { formatCount, formatDuration } from "@/lib/format";
import type { PlanItemKind } from "@/types";

/** `plan_items.target_unit` (planner `TargetUnit` ile aynı; lib features'ı import etmez). */
export type TaskTargetUnit = "questions" | "minutes";

/**
 * Otomatik görev başlığı (08 §2 Parça 2): "Üslü İfadeler · 40 soru", "Basınç · tekrar",
 * "Matematik · 20 soru", "Bağlantı". Koç başlığı düzenleyebilir; boş bırakırsa bu üretilir.
 * `lib/` altında: planner (form, eylem, havuz) ve analytics (öneri görevi) ortak kullanır.
 */
export function taskTitle(input: {
  kind: PlanItemKind;
  subjectName: string | null;
  topicName: string | null;
  targetValue: number | null;
  targetUnit: TaskTargetUnit | null;
}): string {
  const { kind, subjectName, topicName, targetValue, targetUnit } = input;
  const base = topicName ?? subjectName;
  const target =
    targetValue && targetUnit === "questions"
      ? formatCount(targetValue, "soru")
      : targetValue && targetUnit === "minutes"
        ? formatDuration(targetValue)
        : null;

  switch (kind) {
    case "questions":
      return [base, target].filter(Boolean).join(" · ") || planItemKindLabels.questions;
    case "topic_study":
      return base ? `${base} · konu çalışması` : planItemKindLabels.topic_study;
    case "review":
      return base ? `${base} · tekrar` : planItemKindLabels.review;
    case "link":
      return base ? `${base} · bağlantı` : planItemKindLabels.link;
    case "custom":
      return base ?? planItemKindLabels.custom;
  }
}

/** Kart alt satırı: "Matematik · 40 soru · 60 dk". */
export function taskMeta(input: {
  subjectName: string | null;
  targetValue: number | null;
  targetUnit: TaskTargetUnit | null;
  estimatedMinutes: number;
}): string {
  const parts: string[] = [];
  if (input.subjectName) parts.push(input.subjectName);
  if (input.targetValue && input.targetUnit === "questions") {
    parts.push(formatCount(input.targetValue, "soru"));
  }
  parts.push(formatDuration(input.estimatedMinutes));
  return parts.join(" · ");
}
