import type { OrgSettings } from "@/features/core";
import { formatCount } from "@/lib/format";
import { taskTitle, type TaskTargetUnit } from "@/lib/plan/task-title";
import { allocateByMix, mixCategoryOf, type MixCategory } from "@/lib/strategy/mix";
import { examProximity } from "@/lib/strategy/periods";
import type { PlanItemKind, TopicAlertKind } from "@/types";
import type { StudentStrategy, TopicAlert } from "../types";
import { alertReason } from "./alerts";
import { priorityScore } from "./priority";

/** Önerilen görev: `addPlanItems` girdisiyle aynı alanlar; başlık `taskTitle` ile üretilir. */
export type SuggestionTask = {
  kind: PlanItemKind;
  targetValue: number | null;
  targetUnit: TaskTargetUnit | null;
  estimatedMinutes: number;
  title: string;
  /** Faz 7: konuya eşli kaynak testi / video görevi (11 §3.3). */
  sectionId?: string;
  videoId?: string;
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
  /** Strateji notu (Faz 5c/6b): "hedef tarihi 2 hafta geçti" · "son 3 denemede 7 yanlış" · "bu derste soru hedefinin gerisinde". */
  strategyNote?: string;
};

/** Ders soru açığı bu oranın altındaysa not yazılmaz (küçük sapmalar gürültü olmasın). */
export const SUBJECT_GAP_NOTE_MIN = 0.2;

/**
 * Strateji notu: önce konu hedef gecikmesi ("hedef tarihi 2 hafta geçti", 7 günden azsa gün),
 * sonra dersin deneme yanlışı ("son 3 denemede 7 yanlış"; Faz 6b, `wrong > 0` ve `exams >= 1`),
 * yoksa ders soru açığı (`SUBJECT_GAP_NOTE_MIN` ve üstü). Hiçbiri yoksa undefined.
 */
export function strategyNoteFor(input: {
  targetDelayDays: number | undefined;
  subjectGap: number | undefined;
  mockWrong?: { wrong: number; exams: number } | undefined;
}): string | undefined {
  const delay = input.targetDelayDays ?? 0;
  if (delay > 0) {
    const text =
      delay >= 7 ? formatCount(Math.round(delay / 7), "hafta") : formatCount(delay, "gün");
    return `hedef tarihi ${text} geçti`;
  }
  const mock = input.mockWrong;
  if (mock && mock.exams >= 1 && mock.wrong > 0) {
    return `son ${formatCount(mock.exams, "denemede")} ${formatCount(mock.wrong, "yanlış")}`;
  }
  if ((input.subjectGap ?? 0) >= SUBJECT_GAP_NOTE_MIN) return "bu derste soru hedefinin gerisinde";
  return undefined;
}

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
  mock_weak: "topic_study",
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
 * azalan; eşit puanda uyarı sırası (öncelik, gecikme, ders/konu) korunur. Faz 5c (09 §2 Parça 3):
 * `strategy` verilirse puan sınav yakınlığı / hedef gecikmesi / ders açığıyla hesaplanır, dönem
 * karışımı varsa öğrenci kotası `allocateByMix` ile kategori bazında puan sırasıyla dolar,
 * dolmayan kota kalan en yüksek puanlılara açılır; satıra `strategyNote` eklenir. Verilmezse
 * Faz 4 davranışı birebir.
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
  /** Öğrenci → strateji bağlamı (`getStrategyContext`); yoksa Faz 4 davranışı. */
  strategy?: ReadonlyMap<string, StudentStrategy>;
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

    const st = input.strategy?.get(a.studentId);
    const targetDelayDays = st && a.topicId ? st.topicDelayDays.get(a.topicId) : undefined;
    const subjectGap = st?.subjectGap.get(a.subject.id);
    const strategyNote = st
      ? strategyNoteFor({
          targetDelayDays,
          subjectGap,
          mockWrong: st.subjectMockWrong.get(a.subject.id),
        })
      : undefined;

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
        examProximity:
          st && st.daysToExam !== null
            ? examProximity(st.daysToExam, settings.strategy.proximity_days)
            : 0,
        targetDelayDays: targetDelayDays ?? 0,
        subjectGap: subjectGap ?? 0,
      }),
      ...(strategyNote ? { strategyNote } : {}),
    });
  }

  scored.sort((x, y) => y.score - x.score);

  const max = settings.suggestions.max_per_student;
  const chosen = new Set<Suggestion>();
  const byStudent = new Map<string, Suggestion[]>();
  for (const s of scored)
    (byStudent.get(s.studentId) ?? byStudent.set(s.studentId, []).get(s.studentId))!.push(s);

  for (const [studentId, list] of byStudent) {
    const mix = input.strategy?.get(studentId)?.mix ?? null;
    if (!mix) {
      for (const s of list.slice(0, max)) chosen.add(s);
      continue;
    }
    // Kategori kotası puan sırasıyla dolar; dolmayan kota kalan en yüksek puanlılara açılır.
    const quota: Record<MixCategory, number> = allocateByMix(max, mix);
    const leftovers: Suggestion[] = [];
    let taken = 0;
    for (const s of list) {
      const category = mixCategoryOf(s.kind);
      if (quota[category] > 0) {
        quota[category]--;
        chosen.add(s);
        taken++;
      } else {
        leftovers.push(s);
      }
    }
    for (const s of leftovers) {
      if (taken >= max) break;
      chosen.add(s);
      taken++;
    }
  }

  return scored.filter((s) => chosen.has(s));
}
