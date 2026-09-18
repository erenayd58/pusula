import type { OrgSettings } from "@/features/core";
import { taskTitle, type TaskTargetUnit } from "@/lib/plan/task-title";
import type { PlanItemKind, TopicAlertKind } from "@/types";
import type { TopicAlert } from "../types";
import { alertReason } from "./alerts";
import { priorityScore } from "./priority";

/** Önerilen görev: `addPlanItems` girdisiyle aynı alanlar; başlık `taskTitle` ile üretilir. */
export type SuggestionTask = {
  kind: PlanItemKind;
  targetValue: number | null;
  targetUnit: TaskTargetUnit | null;
  estimatedMinutes: number;
  title: string;
};

export type Suggestion = {
  studentId: string;
  subjectId: string;
  subjectName: string;
  subjectShortName: string;
  subjectColor: string;
  topicId: string | null;
  topicName: string | null;
  kind: TopicAlertKind;
  /** Kısa Türkçe sebep (`alertReason`). */
  reason: string;
  task: SuggestionTask;
  /** 0–100 (`priorityScore`). */
  score: number;
};

/** Reddetme anahtarı: öğrenci × tür × ders × konu (ders düzeyinde konu boş). */
export function dismissalKey(
  studentId: string,
  kind: TopicAlertKind,
  subjectId: string,
  topicId: string | null,
): string {
  return `${studentId}:${kind}:${subjectId}:${topicId ?? ""}`;
}

/** "Bu hafta planlı" anahtarları: konu için `öğrenci:konu`, ders için `öğrenci:ders`. */
export function plannedKey(studentId: string, id: string): string {
  return `${studentId}:${id}`;
}

/** Uyarı türü → görev türü (08 §2 Parça 4; planner `alert-pool.ts` ile aynı eşleme). */
const TASK_KIND: Record<TopicAlertKind, PlanItemKind> = {
  knowledge_gap: "topic_study",
  not_started: "topic_study",
  behind_school: "topic_study",
  low_accuracy: "questions",
  neglected_subject: "questions",
  review_due: "review",
  forgetting_risk: "review",
  stale: "review",
};

/**
 * Uyarıdan görev: konu çalışması (`topic_study_minutes`), soru (`questions_target` ×
 * `minutes_per_question`; öğrenci temposu planner formunda ayrıca önerilir), tekrar
 * (`review_minutes`). Kurum ayarı parametredir, eşik koda gömülmez.
 */
export function alertToTask(alert: TopicAlert, planner: OrgSettings["planner"]): SuggestionTask {
  const kind = TASK_KIND[alert.kind];
  const targetValue = kind === "questions" ? planner.questions_target : null;
  const targetUnit: TaskTargetUnit | null = kind === "questions" ? "questions" : null;
  const minutes =
    kind === "questions"
      ? planner.questions_target * planner.minutes_per_question
      : kind === "topic_study"
        ? planner.topic_study_minutes
        : planner.review_minutes;
  return {
    kind,
    targetValue,
    targetUnit,
    estimatedMinutes: Math.min(600, Math.max(1, Math.round(minutes))),
    title: taskTitle({
      kind,
      subjectName: alert.subject.name,
      topicName: alert.topicName,
      targetValue,
      targetUnit,
    }),
  };
}

/**
 * Öneri motoru (08 §2 Parça 4; saf): uyarılar → bu hafta planlı ve reddedilmiş olanlar
 * elenir → önem puanı → öğrenci başına en fazla `suggestions.max_per_student`. Sıra puana göre
 * azalan; eşit puanda uyarı sırası (öncelik, gecikme, ders/konu) korunur. Faz 5 `strategy`
 * parametresini (sınava kalan gün, hedef ders dağılımı) bu imzaya ekler (08 §5).
 */
export function buildSuggestions(input: {
  alerts: readonly TopicAlert[];
  /** `plannedKey(öğrenci, konu)`: bu hafta planda olan konular. */
  plannedTopicIds: ReadonlySet<string>;
  /** `plannedKey(öğrenci, ders)`: bu hafta konulu görevi olan dersler (ders düzeyi öneri elenir). */
  plannedSubjectIds: ReadonlySet<string>;
  /** `dismissalKey(...)` → `dismissed_until` (YYYY-MM-DD); `today`dan eski kayıt sayılmaz. */
  dismissed: ReadonlyMap<string, string>;
  settings: OrgSettings;
  maxExamQuestionCount: number;
  today: string;
}): Suggestion[] {
  const { alerts, settings, today } = input;
  const scored: Suggestion[] = [];

  for (const a of alerts) {
    const planned = a.topicId
      ? input.plannedTopicIds.has(plannedKey(a.studentId, a.topicId))
      : input.plannedSubjectIds.has(plannedKey(a.studentId, a.subject.id));
    if (planned) continue;
    const until = input.dismissed.get(dismissalKey(a.studentId, a.kind, a.subject.id, a.topicId));
    if (until && until >= today) continue;

    scored.push({
      studentId: a.studentId,
      subjectId: a.subject.id,
      subjectName: a.subject.name,
      subjectShortName: a.subject.shortName,
      subjectColor: a.subject.color,
      topicId: a.topicId,
      topicName: a.topicName,
      kind: a.kind,
      reason: alertReason(a),
      task: alertToTask(a, settings.planner),
      score: priorityScore({
        examQuestionCount: a.subject.examQuestionCount ?? 0,
        maxExamQuestionCount: input.maxExamQuestionCount,
        delayDays: a.delayDays,
        kind: a.kind,
        accuracy: a.accuracy,
        threshold: a.threshold,
      }),
    });
  }

  scored.sort((x, y) => y.score - x.score);

  const perStudent = new Map<string, number>();
  const max = settings.suggestions.max_per_student;
  return scored.filter((s) => {
    const n = perStudent.get(s.studentId) ?? 0;
    if (n >= max) return false;
    perStudent.set(s.studentId, n + 1);
    return true;
  });
}
