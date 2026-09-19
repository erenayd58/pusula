import type { PlanItemKind } from "@/types";

/** `OrgSettings["planner"]` ile aynı alanlar (features/core/lib/org-settings). */
export type PlannerDefaults = {
  minutes_per_question: number;
  topic_study_minutes: number;
  review_minutes: number;
  link_minutes: number;
  custom_minutes: number;
  questions_target: number;
};

/**
 * Tahmini süre önerisi (08 §2 Parça 2): soru görevinde hedef × öğrencinin o dersteki temposu
 * (son 60 günün soru/dakika ortalaması, `v_student_subject_pace`); tempo yoksa kurum
 * varsayılanı. Diğer türlerde kurum varsayılanı. Koç değeri değiştirebilir. 1–600 dk.
 */
export function estimateMinutes(input: {
  kind: PlanItemKind;
  targetValue: number | null;
  pace: { minutesPerQuestion: number } | null;
  defaults: PlannerDefaults;
}): number {
  const { kind, targetValue, pace, defaults } = input;
  let minutes: number;
  switch (kind) {
    case "questions": {
      const perQuestion =
        pace && pace.minutesPerQuestion > 0
          ? pace.minutesPerQuestion
          : defaults.minutes_per_question;
      minutes = (targetValue ?? defaults.questions_target) * perQuestion;
      break;
    }
    case "topic_study":
      minutes = defaults.topic_study_minutes;
      break;
    case "review":
      minutes = defaults.review_minutes;
      break;
    case "link":
      minutes = defaults.link_minutes;
      break;
    case "custom":
      minutes = defaults.custom_minutes;
      break;
    case "section": {
      // Kaynak testi = soru görevi (hedef test soru sayısı).
      const perQuestion =
        pace && pace.minutesPerQuestion > 0
          ? pace.minutesPerQuestion
          : defaults.minutes_per_question;
      minutes = (targetValue ?? defaults.questions_target) * perQuestion;
      break;
    }
    case "video":
      // Video süresi havuz/öneride `videoMinutes` ile verilir; formda bağlantı varsayılanı.
      minutes = targetValue ?? defaults.link_minutes;
      break;
  }
  return Math.min(600, Math.max(1, Math.round(minutes)));
}
