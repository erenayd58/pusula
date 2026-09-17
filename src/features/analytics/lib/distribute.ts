import type { Suggestion } from "./suggestions";

/**
 * Bir günün müsait süresi. `schedule` modülünün `DayAvailability` tipi yapısal olarak uyar;
 * analytics schedule'ı import etmez, planner değeri parametre olarak geçirir (08 §0).
 * Geçmiş günler çağıran tarafından dizide verilmez.
 */
export type DistributeDay = { dayOfWeek: number; availableMinutes: number };

/** Plandaki mevcut görev: gün (null = bu hafta içinde), ders ve tahmini süre. */
export type ExistingItem = { dayOfWeek: number | null; subjectId: string | null; minutes: number };

export type Placement = { dayOfWeek: number | null; suggestion: Suggestion };

/**
 * Önerileri günlere dağıtır (08 §2 Parça 4; saf): puana göre sırayla; her öneri için kapasitesi
 * (müsait × ratio − planlanan) en yüksek ve dersin gün sınırını (`maxPerSubjectPerDay`) aşmayan
 * gün seçilir, eşitlikte erken gün; hiçbir güne sığmayan `null` ("bu hafta içinde"). Faz 5
 * `days`'i çok haftalık dizi olarak verir (geri planlama), imza değişmez (08 §5).
 */
export function distributeTasks(input: {
  suggestions: readonly Suggestion[];
  days: readonly DistributeDay[];
  existing: readonly ExistingItem[];
  ratio: number;
  maxPerSubjectPerDay: number;
}): Placement[] {
  const capacity = new Map<number, number>();
  const subjectCount = new Map<string, number>();
  const countKey = (day: number, subjectId: string) => `${day}:${subjectId}`;

  for (const d of input.days) capacity.set(d.dayOfWeek, d.availableMinutes * input.ratio);
  for (const e of input.existing) {
    if (e.dayOfWeek === null || !capacity.has(e.dayOfWeek)) continue;
    capacity.set(e.dayOfWeek, (capacity.get(e.dayOfWeek) ?? 0) - e.minutes);
    if (e.subjectId) {
      const k = countKey(e.dayOfWeek, e.subjectId);
      subjectCount.set(k, (subjectCount.get(k) ?? 0) + 1);
    }
  }

  const ordered = [...input.suggestions].sort((a, b) => b.score - a.score);
  const out: Placement[] = [];

  for (const s of ordered) {
    let best: number | null = null;
    let bestCapacity = -Infinity;
    for (const d of input.days) {
      const left = capacity.get(d.dayOfWeek) ?? 0;
      if (left < s.task.estimatedMinutes) continue;
      if (
        (subjectCount.get(countKey(d.dayOfWeek, s.subjectId)) ?? 0) >= input.maxPerSubjectPerDay
      ) {
        continue;
      }
      if (left > bestCapacity) {
        best = d.dayOfWeek;
        bestCapacity = left;
      }
    }
    if (best !== null) {
      capacity.set(best, bestCapacity - s.task.estimatedMinutes);
      const k = countKey(best, s.subjectId);
      subjectCount.set(k, (subjectCount.get(k) ?? 0) + 1);
    }
    out.push({ dayOfWeek: best, suggestion: s });
  }

  return out;
}
