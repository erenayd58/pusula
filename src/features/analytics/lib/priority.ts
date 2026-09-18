import { mixCategoryOf } from "@/lib/strategy/mix";
import type { TopicAlertKind } from "@/types";

/**
 * Önem puanı (08 §2 Parça 4; saf): 0–100 = 100 × (0.4 × ders + 0.3 × zayıflık + 0.3 × gecikme).
 * Ders ağırlığı sınav soru sayısından (0–1), gecikme eşiği aşan gün sayısından (30 günde doyar),
 * zayıflık uyarı türünün taban puanı × başarı ölçeği. Faz 5c (09 §2 Parça 3, karar B9) strateji
 * alanlarını isteğe bağlı ekler: gecikme = max(uyarı, hedef gecikmesi); ders × (1 + soru açığı);
 * sınav yakınlığı çarpanı 1 ± 0,25 × yakınlık (zayıf/bakım +, yeni konu −). Verilmezse Faz 4
 * sonucu birebir.
 */
export const SCORE_WEIGHTS = { subject: 0.4, weakness: 0.3, delay: 0.3 } as const;

/** Sınav yakınlığı çarpanının genliği: taban × (1 ± PROXIMITY_SWING × yakınlık). */
export const PROXIMITY_SWING = 0.25;

/** Gecikme bu günden sonra artmaz. */
export const DELAY_SATURATION_DAYS = 30;

/** Tür taban puanı (zayıflık derecesi). */
export const KIND_BASE_SCORE: Record<TopicAlertKind, number> = {
  knowledge_gap: 1,
  low_accuracy: 0.8,
  forgetting_risk: 0.7,
  stale: 0.6,
  review_due: 0.6,
  neglected_subject: 0.5,
  behind_school: 0.75,
  not_started: 0.4,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function priorityScore(input: {
  /** Dersin sınavdaki soru sayısı; ağırlık = examQuestionCount / maxExamQuestionCount. */
  examQuestionCount: number;
  maxExamQuestionCount: number;
  /** Kural eşiğini aşan gün sayısı (`TopicAlert.delayDays`); 30'da doyar. */
  delayDays: number;
  kind: TopicAlertKind;
  /** Başarı yüzdesi ve kuralın başarı eşiği; ikisi de doluysa taban puan 0.5–1 arası ölçeklenir. */
  accuracy: number | null;
  threshold: number | null;
  /** Sınav yakınlığı 0–1 (`examProximity`); yoksa 0. */
  examProximity?: number;
  /** Konu hedef tarihini aşan gün; gecikme = max(delayDays, targetDelayDays). */
  targetDelayDays?: number;
  /** Ders soru açığı 0–1; ders ağırlığı × (1 + açık), 1'e kırpılır. */
  subjectGap?: number;
}): number {
  const subject =
    input.maxExamQuestionCount > 0
      ? clamp01(
          (input.examQuestionCount / input.maxExamQuestionCount) *
            (1 + clamp01(input.subjectGap ?? 0)),
        )
      : 0;
  const delay = clamp01(
    Math.max(input.delayDays, input.targetDelayDays ?? 0) / DELAY_SATURATION_DAYS,
  );
  // Eşiğin altında kaldıkça (threshold − accuracy) / threshold büyür: 0 → ölçek 0.5, 1 → ölçek 1.
  const scale =
    input.accuracy !== null && input.threshold !== null && input.threshold > 0
      ? 0.5 + 0.5 * clamp01((input.threshold - input.accuracy) / input.threshold)
      : 1;
  const weakness = KIND_BASE_SCORE[input.kind] * scale;

  const base =
    100 *
    (SCORE_WEIGHTS.subject * subject +
      SCORE_WEIGHTS.weakness * weakness +
      SCORE_WEIGHTS.delay * delay);
  // Sınav yaklaştıkça zayıf ve bakım konuları öne, yeni konu geriye (karar B9).
  const direction = mixCategoryOf(input.kind) === "new_topic" ? -1 : 1;
  const proximity = clamp01(input.examProximity ?? 0);
  return Math.round(
    Math.min(100, Math.max(0, base * (1 + PROXIMITY_SWING * proximity * direction))),
  );
}
