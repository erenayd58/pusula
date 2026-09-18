import type { Suggestion, TopicAlert } from "@/features/analytics";
import type { PlanItemKind, TopicAlertKind } from "@/types";
import type { TargetUnit, TaskPoolCategoryId, TaskPoolItem } from "../types";
import { estimateMinutes, type PlannerDefaults } from "./estimate";
import { taskTitle } from "@/lib/plan/task-title";

/**
 * Konu uyarılarını havuz öğesine çevirir (Parça 3). Saf: analytics'ten yalnızca tip alır; sebep
 * metni (`alertReason`) çağıran sayfadan parametre gelir (çalışma zamanında modüller arası
 * import yok; birim test sunucu koduna dokunmaz). `pool.ts`'ten ayrı dosya: istemci bileşeni
 * (`task-pool.tsx`) `pool.ts`'i kullanır, bu dosyaya dokunmaz.
 */

type AlertCategoryId = Extract<TaskPoolCategoryId, "behind" | "weak" | "not_started" | "review_due">;
export type AlertPool = Record<AlertCategoryId, TaskPoolItem[]>;

/** Uyarı türü → görev türü ve havuz kategorisi (08 §2 Parça 4 ile aynı eşleme). */
const ALERT_TASK: Partial<
  Record<TopicAlertKind, { kind: PlanItemKind; category: AlertCategoryId }>
> = {
  knowledge_gap: { kind: "topic_study", category: "weak" },
  low_accuracy: { kind: "questions", category: "weak" },
  behind_school: { kind: "topic_study", category: "behind" },
  not_started: { kind: "topic_study", category: "not_started" },
  review_due: { kind: "review", category: "review_due" },
  forgetting_risk: { kind: "review", category: "review_due" },
  stale: { kind: "review", category: "review_due" },
};

/**
 * `weak` (bilgi eksiği → konu çalışması, düşük başarı → soru), `behind` (okulun gerisinde → konu
 * çalışması; Faz 5a), `not_started` (konu çalışması), `review_due` (bakım türleri → tekrar). Tahmini süre `estimateMinutes`, başlık `taskTitle`,
 * sebep `alertReason`. Ders düzeyi uyarılar (topicId boş) havuza girmez.
 */
export function alertsToPoolItems(
  alerts: readonly TopicAlert[],
  opts: {
    pace: Record<string, number>;
    defaults: PlannerDefaults;
    reason: (alert: TopicAlert) => string;
  },
): AlertPool {
  const out: AlertPool = { behind: [], weak: [], not_started: [], review_due: [] };
  for (const a of alerts) {
    if (!a.topicId) continue;
    const spec = ALERT_TASK[a.kind];
    if (!spec) continue;
    const { kind, category } = spec;
    const targetValue = kind === "questions" ? opts.defaults.questions_target : null;
    const targetUnit: TargetUnit | null = kind === "questions" ? "questions" : null;
    const pace = opts.pace[a.subject.id];
    out[category].push({
      key: `${category}:${a.kind}:${a.topicId}`,
      categoryId: category,
      kind,
      title: taskTitle({
        kind,
        subjectName: a.subject.name,
        topicName: a.topicName,
        targetValue,
        targetUnit,
      }),
      subjectId: a.subject.id,
      topicId: a.topicId,
      targetValue,
      targetUnit,
      estimatedMinutes: estimateMinutes({
        kind,
        targetValue,
        pace: pace ? { minutesPerQuestion: pace } : null,
        defaults: opts.defaults,
      }),
      reason: opts.reason(a),
    });
  }
  return out;
}

/**
 * Önerileri havuzun `suggestions` kategorisine çevirir (Parça 4): görev alanları öneri
 * motorundan hazır gelir (`alertToTask`), sebep `Suggestion.reason`. Sıra puana göre.
 */
export function suggestionsToPoolItems(suggestions: readonly Suggestion[]): TaskPoolItem[] {
  return suggestions.map((s) => ({
    key: `suggestions:${s.kind}:${s.subjectId}:${s.topicId ?? ""}`,
    categoryId: "suggestions",
    kind: s.task.kind,
    title: s.task.title,
    subjectId: s.subjectId,
    topicId: s.topicId,
    targetValue: s.task.targetValue,
    targetUnit: s.task.targetUnit,
    estimatedMinutes: s.task.estimatedMinutes,
    reason: s.reason,
  }));
}
