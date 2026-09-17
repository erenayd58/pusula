import { formatCount } from "@/lib/format";
import type { TopicAlertKind } from "@/types";
import type { TopicAlert } from "../types";

/**
 * Öğrenci Bugün kartı (karar A7): yalnızca bakım türleri ve sıradaki konu; başarı dili
 * (bilgi eksiği, düşük başarı, ihmal) öğrenciye gösterilmez. En fazla bir kart.
 */
const NUDGE_PRIORITY: Partial<Record<TopicAlertKind, number>> = {
  review_due: 0,
  forgetting_risk: 1,
  stale: 2,
  not_started: 3,
};

export function pickStudentNudge(alerts: TopicAlert[]): TopicAlert | null {
  let best: TopicAlert | null = null;
  for (const a of alerts) {
    const p = NUDGE_PRIORITY[a.kind];
    if (p === undefined) continue;
    if (
      !best ||
      p < (NUDGE_PRIORITY[best.kind] ?? Infinity) ||
      (p === NUDGE_PRIORITY[best.kind] && a.delayDays > best.delayDays)
    ) {
      best = a;
    }
  }
  return best;
}

/** Nötr, "sen" dilinde kart metni; suçlayıcı ifade yok. Konu adı ek almaz ("… konusuna"). */
export function nudgeText(a: TopicAlert): { title: string; body: string } {
  const topic = a.topicName ?? a.subject.name;
  const days = a.idleDays === null ? null : `${formatCount(a.idleDays, "gün")}dür bakmadın.`;
  switch (a.kind) {
    case "review_due":
      return {
        title: `${topic} konusunu tekrar etme zamanı.`,
        body: days ?? "Kısa bir tekrar iyi gelir.",
      };
    case "forgetting_risk":
      return {
        title: `${topic} konusuna bir göz atma zamanı.`,
        body: days ?? "Kısa bir göz atma yeter.",
      };
    case "stale":
      return {
        title: `${topic} konusu bir süredir bekliyor.`,
        body: "İstersen bugün küçük bir adım at.",
      };
    default:
      return {
        title: `Sırada ${topic} var.`,
        body: "İstersen bugün başla.",
      };
  }
}
