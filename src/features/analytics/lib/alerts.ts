import type { OrgSettings } from "@/features/core";
import { daysSince } from "@/lib/dates";
import { accuracyPercent } from "@/lib/exam/net";
import { formatCount, formatPercent } from "@/lib/format";
import { schoolLagWeeks } from "@/lib/strategy/school-calendar";
import type { TopicAlertKind, TopicStatus } from "@/types";
import type {
  AlertGroup,
  AlertSubject,
  SetupAlert,
  SetupFacts,
  TopicAlert,
  TopicAlertFacts,
} from "../types";

/**
 * Kurum ayarındaki `alerts` anahtarı + `strategy.school_lag_weeks` (Faz 5a `behind_school`
 * toleransı); eşikler koda gömülmez, parametre gelir. Sorgu katmanı `alertThresholds` ile kurar.
 */
export type AlertThresholds = OrgSettings["alerts"] &
  Pick<OrgSettings["strategy"], "school_lag_weeks">;

export function alertThresholds(settings: OrgSettings): AlertThresholds {
  return { ...settings.alerts, school_lag_weeks: settings.strategy.school_lag_weeks };
}

/** Listeleme sırası: önce zayıflık, okulun gerisinde, sonra ihmal, bakım, en sonda başlanmamış. */
const KIND_PRIORITY: Record<TopicAlertKind, number> = {
  knowledge_gap: 0,
  low_accuracy: 1,
  behind_school: 2,
  neglected_subject: 3,
  forgetting_risk: 4,
  review_due: 5,
  stale: 6,
  not_started: 7,
};

const DONE: readonly TopicStatus[] = ["completed", "mastered"];
const IN_PROGRESS: readonly TopicStatus[] = ["studying", "needs_review"];

function subjectOf(f: TopicAlertFacts): AlertSubject {
  return {
    id: f.subjectId,
    name: f.subjectName,
    shortName: f.subjectShortName,
    color: f.subjectColor,
    sortOrder: f.subjectSortOrder,
    examQuestionCount: f.examQuestionCount,
  };
}

/** Son etkinlikten bu yana gün: kayıt, tekrar ya da tamamlama; hiçbiri yoksa null. */
function idleDaysOf(f: TopicAlertFacts, today: string): number | null {
  const days = [f.lastTopicLogDate, f.lastReviewedAt, f.completedAt]
    .filter((v): v is string => v !== null)
    .map((v) => daysSince(v, today));
  return days.length > 0 ? Math.min(...days) : null;
}

type RuleHit = Pick<TopicAlert, "kind" | "threshold" | "idleDays" | "delayDays">;

/** Konu düzeyi kurallar, öncelik sırasıyla; ilk eşleşen döner (konu başına en fazla bir). */
function evaluateTopic(f: TopicAlertFacts, t: AlertThresholds, today: string): RuleHit | null {
  const accuracy = accuracyPercent(f.correctWindow, f.questionsWindow);

  if (
    accuracy !== null &&
    f.questionsWindow >= t.knowledge_gap.min_questions &&
    accuracy < t.knowledge_gap.max_accuracy
  ) {
    return {
      kind: "knowledge_gap",
      threshold: t.knowledge_gap.max_accuracy,
      idleDays: null,
      delayDays: 0,
    };
  }
  if (
    accuracy !== null &&
    f.questionsWindow >= t.low_accuracy.min_questions &&
    accuracy < t.low_accuracy.max_accuracy
  ) {
    return {
      kind: "low_accuracy",
      threshold: t.low_accuracy.max_accuracy,
      idleDays: null,
      delayDays: 0,
    };
  }
  // Okulun gerisinde (karar B8): bitmemiş konuların hepsi (`studying` dahil); okul bitişinden
  // `school_lag_weeks` hafta geçtiyse. idleDays = okulun bitirmesinden bu yana gün (sebep metni).
  if (f.schoolFinishOn !== null && !DONE.includes(f.status)) {
    const lagWeeks = schoolLagWeeks(f.schoolFinishOn, today);
    if (lagWeeks >= t.school_lag_weeks) {
      return {
        kind: "behind_school",
        threshold: null,
        idleDays: lagWeeks * 7,
        delayDays: (lagWeeks - t.school_lag_weeks) * 7,
      };
    }
  }
  if (IN_PROGRESS.includes(f.status) && f.statusChangedAt) {
    const days = daysSince(f.statusChangedAt, today);
    if (days >= t.stale_days) {
      return { kind: "stale", threshold: null, idleDays: days, delayDays: days - t.stale_days };
    }
  }
  if (DONE.includes(f.status)) {
    const idle = idleDaysOf(f, today);
    if (
      idle !== null &&
      (accuracy === null || accuracy >= t.forgetting_risk.min_accuracy) &&
      idle >= t.forgetting_risk.idle_days
    ) {
      return {
        kind: "forgetting_risk",
        threshold: t.forgetting_risk.min_accuracy,
        idleDays: idle,
        delayDays: idle - t.forgetting_risk.idle_days,
      };
    }
    if (f.completedAt) {
      // Geçilen en büyük eşik m: tamamlandıktan m gün sonra konuda kayıt/tekrar yoksa tekrar zamanı.
      const completedDays = daysSince(f.completedAt, today);
      const m = Math.max(...t.review_due_days.filter((d) => d <= completedDays), -Infinity);
      if (m !== -Infinity) {
        const sinceDue = completedDays - m;
        const touchedAfterDue = [f.lastTopicLogDate, f.lastReviewedAt]
          .filter((v): v is string => v !== null)
          .some((v) => daysSince(v, today) <= sinceDue);
        if (!touchedAfterDue) {
          return { kind: "review_due", threshold: null, idleDays: idle, delayDays: sinceDue };
        }
      }
    }
  }
  if (f.isNextTopic) {
    return { kind: "not_started", threshold: null, idleDays: null, delayDays: 0 };
  }
  return null;
}

function compareAlerts(a: TopicAlert, b: TopicAlert): number {
  return (
    KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind] ||
    b.delayDays - a.delayDays ||
    a.subject.sortOrder - b.subject.sortOrder ||
    (a.topicSortOrder ?? 0) - (b.topicSortOrder ?? 0)
  );
}

/**
 * Uyarı kuralları (08 §2 Parça 3, 09 §2 Parça 1; saf, eşikler parametre). Konu başına en fazla
 * bir uyarı, öncelik sırası: knowledge_gap → low_accuracy → behind_school → stale →
 * forgetting_risk → review_due → not_started. Ders düzeyi (topicId null): neglected_subject.
 * `today` İstanbul günü (YYYY-MM-DD). Sonuç öncelik, gecikme ve ders/konu sırasına göre sıralıdır.
 */
export function evaluateTopicAlerts(
  facts: TopicAlertFacts[],
  t: AlertThresholds,
  today: string,
): TopicAlert[] {
  const out: TopicAlert[] = [];
  const seenSubjects = new Set<string>();

  for (const f of facts) {
    const accuracy = accuracyPercent(f.correctWindow, f.questionsWindow);
    const hit = evaluateTopic(f, t, today);
    if (hit) {
      out.push({
        studentId: f.studentId,
        subject: subjectOf(f),
        topicId: f.topicId,
        topicName: f.topicName,
        topicSortOrder: f.topicSortOrder,
        questions: f.questionsWindow,
        accuracy,
        ...hit,
      });
    }

    // Ders düzeyi: derste son kayıt (hiç yoksa öğrencinin ilk kaydı) eşik kadar eskiyse.
    const subjectKey = `${f.studentId}:${f.subjectId}`;
    if (seenSubjects.has(subjectKey)) continue;
    seenSubjects.add(subjectKey);
    const ref = f.subjectLastLogDate ?? f.studentFirstLogDate;
    if (!ref) continue;
    const days = daysSince(ref, today);
    if (days >= t.neglected_subject_days) {
      out.push({
        studentId: f.studentId,
        subject: subjectOf(f),
        topicId: null,
        topicName: null,
        topicSortOrder: null,
        kind: "neglected_subject",
        questions: 0,
        accuracy: null,
        threshold: null,
        idleDays: days,
        delayDays: days - t.neglected_subject_days,
      });
    }
  }

  return out.sort(compareAlerts);
}

/**
 * Ekran grupları: weak = başarı kuralları, behind = okulun gerisinde, maintenance = bakım,
 * subjects = ders düzeyi. `not_started` gruplanmaz (dikkat gerektirmez).
 */
export function groupAlerts(alerts: TopicAlert[]): AlertGroup {
  const g: AlertGroup = { weak: [], behind: [], maintenance: [], subjects: [] };
  for (const a of alerts) {
    switch (a.kind) {
      case "knowledge_gap":
      case "low_accuracy":
        g.weak.push(a);
        break;
      case "behind_school":
        g.behind.push(a);
        break;
      case "review_due":
      case "forgetting_risk":
      case "stale":
        g.maintenance.push(a);
        break;
      case "neglected_subject":
        g.subjects.push(a);
        break;
      case "not_started":
        break;
    }
  }
  return g;
}

/** Kurulum uyarısı → gerektirdiği modül; modül kapalıysa uyarı üretilmez. */
const SETUP_MODULE: Record<SetupAlert["kind"], string> = {
  no_schedule: "schedule",
  no_goal: "goals",
  no_plan: "planner",
  no_logs: "question-log",
};

/**
 * Kurulum uyarıları (yalnızca koç; sırası kurulum adımlarıdır): program yok, hedef yok, bu hafta
 * yayınlanmış plan yok, hiç soru kaydı yok (hesap `setup_account_days`'den eskiyse). Soru kaydı
 * olan öğrencide program ve kayıt uyarısı üretilmez; plan/hedef eksiği yine gösterilir.
 */
export function evaluateSetupAlerts(
  facts: readonly SetupFacts[],
  t: Pick<AlertThresholds, "setup_account_days">,
  today: string,
): SetupAlert[] {
  const out: SetupAlert[] = [];
  for (const f of facts) {
    const hasLogs = f.questionLogCount > 0;
    const push = (kind: SetupAlert["kind"]) => {
      if (!f.disabledModules.includes(SETUP_MODULE[kind]))
        out.push({ studentId: f.studentId, kind });
    };
    if (!hasLogs && !f.hasSchedule) push("no_schedule");
    if (!f.hasActiveGoal) push("no_goal");
    if (!f.hasPublishedPlanWeek) push("no_plan");
    if (!hasLogs && daysSince(f.createdAt, today) >= t.setup_account_days) push("no_logs");
  }
  return out;
}

/** Kısa sebep metni (koç dili, nötr): "40 soruda %52 başarı" · "12 gündür bakılmadı". */
export function alertReason(a: TopicAlert): string {
  const days = a.idleDays === null ? null : formatCount(a.idleDays, "gün");
  switch (a.kind) {
    case "knowledge_gap":
    case "low_accuracy":
      return `${formatCount(a.questions, "soru")}da ${formatPercent(a.accuracy ?? 0)} başarı`;
    case "stale":
      return days ? `${days}dür ilerleme yok` : "İlerleme yok";
    case "forgetting_risk":
      return days ? `${days}dür bakılmadı` : "Bakılmadı";
    case "review_due":
      return days ? `${days}dür tekrar edilmedi` : "Tekrar zamanı geldi";
    case "not_started":
      return "Sıradaki konu";
    case "behind_school": {
      const weeks = Math.floor((a.idleDays ?? 0) / 7);
      return weeks > 0
        ? `Okul bu konuyu ${formatCount(weeks, "hafta")} önce bitirdi`
        : "Okul bu konuyu bitirdi";
    }
    case "neglected_subject":
      return days ? `${days}dür bu derste kayıt yok` : "Bu derste kayıt yok";
  }
}
