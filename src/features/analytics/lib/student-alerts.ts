import type { OrgSettings } from "@/features/core";
import { daysSince, isoDayOfWeek } from "@/lib/dates";
import { formatCount, formatPossessive, formatSigned } from "@/lib/format";
import type { StudentAlert, StudentAlertFacts, StudentAlertKind } from "../types";

/**
 * Öğrenci düzeyi uyarı kuralları (Faz 8, 01 §7; 12 §3.2). Saf; eşikler kurum ayarı
 * `student_alerts`'ten parametre gelir. Olgular `v_coach_student_overview` satırından.
 * Öğrenci başına birden fazla uyarı olabilir; sıra: hareketsizlik → net düşüşü → plan uyumu →
 * hedef geride → birikmiş tekrar. Aktif olmayan öğrenci dışarıda; hiç kaydı olmayan öğrencide
 * hareketsizlik üretilmez (kurulum uyarısı "hiç soru kaydı yok" zaten var).
 */
export type StudentAlertThresholds = OrgSettings["student_alerts"];

const KIND_ORDER: readonly StudentAlertKind[] = [
  "inactive",
  "net_drop",
  "low_plan",
  "goal_behind",
  "overdue_reviews",
];

function evaluateOne(
  f: StudentAlertFacts,
  t: StudentAlertThresholds,
  today: string,
): StudentAlert[] {
  const out: StudentAlert[] = [];
  const push = (kind: StudentAlertKind, value: number) =>
    out.push({ studentId: f.studentId, kind, value });

  if (f.lastLogDate !== null) {
    const days = daysSince(f.lastLogDate, today);
    if (days >= t.inactivity_days) push("inactive", days);
  }
  if (f.netDelta !== null && f.netDelta <= -t.net_drop) push("net_drop", f.netDelta);
  if (f.planPercentLastWeek !== null && f.planPercentLastWeek < t.low_plan_percent) {
    push("low_plan", f.planPercentLastWeek);
  }
  if (
    f.weeklyTarget !== null &&
    f.weekGoalPercent !== null &&
    isoDayOfWeek(today) >= t.goal_behind.from_isodow &&
    f.weekGoalPercent < t.goal_behind.min_percent
  ) {
    push("goal_behind", f.weekGoalPercent);
  }
  if (f.overdueReviews > t.overdue_reviews_max) push("overdue_reviews", f.overdueReviews);
  return out.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
}

/** `today` İstanbul günü (YYYY-MM-DD). Sonuç öğrenci sırasını korur, öğrenci içinde tür sırası sabit. */
export function evaluateStudentAlerts(
  facts: readonly StudentAlertFacts[],
  t: StudentAlertThresholds,
  today: string,
): StudentAlert[] {
  return facts.filter((f) => f.status === "active").flatMap((f) => evaluateOne(f, t, today));
}

/** Kısa sebep (koç dili, nötr): "5 gündür kayıt yok" · "Son denemede −6,33 net" · "18 tekrar birikti". */
export function studentAlertReason(a: StudentAlert): string {
  switch (a.kind) {
    case "inactive":
      return `${formatCount(a.value, "gün")}dür kayıt yok`;
    case "net_drop":
      return `Son denemede ${formatSigned(a.value)} net`;
    case "low_plan":
      return `Geçen hafta planın %${formatPossessive(a.value)} tamamlandı`;
    case "goal_behind":
      return `Haftalık hedefin %${formatPossessive(a.value)} tamamlandı`;
    case "overdue_reviews":
      return `${formatCount(a.value, "tekrar")} birikti`;
  }
}

/** Hızlı eylem (04 §8.4 K1): türe göre düğme metni ve hedef sayfa. */
export function studentAlertAction(a: StudentAlert): { label: string; href: string } {
  const base = `/coach/students/${a.studentId}`;
  switch (a.kind) {
    case "inactive":
      return { label: "Not yaz", href: `${base}/notes?new=1` };
    case "goal_behind":
      return { label: "Hedefi aç", href: `${base}#goals` };
    case "net_drop":
    case "low_plan":
      return { label: "Planı gözden geçir", href: `${base}/plan` };
    case "overdue_reviews":
      return { label: "Tekrar planı kur", href: `${base}/plan` };
  }
}
