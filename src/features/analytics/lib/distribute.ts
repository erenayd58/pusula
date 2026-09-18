import type { Suggestion } from "./suggestions";

/**
 * Bir günün müsait süresi. `schedule` modülünün `DayAvailability` tipi yapısal olarak uyar;
 * analytics schedule'ı import etmez, planner değeri parametre olarak geçirir (08 §0).
 * Geçmiş günler çağıran tarafından dizide verilmez. `date` (YYYY-MM-DD) verilirse gün anahtarı
 * odur: çok haftalık ufukta aynı haftanın günü iki kez geçebilir (09 §2 Parça 3).
 */
export type DistributeDay = { dayOfWeek: number; availableMinutes: number; date?: string };

/** Plandaki mevcut görev: gün (null = bu hafta içinde), ders ve tahmini süre; çok haftada `date`. */
export type ExistingItem = {
  dayOfWeek: number | null;
  subjectId: string | null;
  minutes: number;
  date?: string;
};

export type Placement = { dayOfWeek: number | null; date?: string; suggestion: Suggestion };

/** Gün anahtarı: tarih varsa tarih, yoksa haftanın günü (tek hafta kullanımı). */
function dayKey(day: { dayOfWeek: number | null; date?: string }): string | null {
  if (day.date !== undefined) return day.date;
  return day.dayOfWeek === null ? null : String(day.dayOfWeek);
}

/**
 * Önerileri günlere dağıtır (08 §2 Parça 4; saf): puana göre sırayla; her öneri için sığan
 * (kapasite = müsait × ratio − planlanan) ve dersin gün sınırını (`maxPerSubjectPerDay`) aşmayan
 * günler arasından o gün aynı dersten görev sayısı en az, sonra kalan kapasitesi en yüksek,
 * eşitlikte dizide erken olan gün seçilir (ders çeşitliliği: karışık pratik, Faz 5c); hiçbir
 * güne sığmayan `null` ("bu hafta içinde"). `days` `date` anahtarıyla çok haftalık verilebilir
 * (08 §5 kancası; Faz 5'te tek hafta kullanılır).
 */
export function distributeTasks(input: {
  suggestions: readonly Suggestion[];
  days: readonly DistributeDay[];
  existing: readonly ExistingItem[];
  ratio: number;
  maxPerSubjectPerDay: number;
}): Placement[] {
  const capacity = new Map<string, number>();
  const subjectCount = new Map<string, number>();
  const countKey = (day: string, subjectId: string) => `${day}:${subjectId}`;

  for (const d of input.days) capacity.set(dayKey(d)!, d.availableMinutes * input.ratio);
  for (const e of input.existing) {
    const key = dayKey(e);
    if (key === null || !capacity.has(key)) continue;
    capacity.set(key, (capacity.get(key) ?? 0) - e.minutes);
    if (e.subjectId) {
      const k = countKey(key, e.subjectId);
      subjectCount.set(k, (subjectCount.get(k) ?? 0) + 1);
    }
  }

  const ordered = [...input.suggestions].sort((a, b) => b.score - a.score);
  const out: Placement[] = [];

  for (const s of ordered) {
    let best: DistributeDay | null = null;
    let bestKey = "";
    let bestCapacity = -Infinity;
    let bestCount = Infinity;
    for (const d of input.days) {
      const key = dayKey(d)!;
      const left = capacity.get(key) ?? 0;
      if (left < s.task.estimatedMinutes) continue;
      const count = subjectCount.get(countKey(key, s.subjectId)) ?? 0;
      if (count >= input.maxPerSubjectPerDay) continue;
      if (count < bestCount || (count === bestCount && left > bestCapacity)) {
        best = d;
        bestKey = key;
        bestCapacity = left;
        bestCount = count;
      }
    }
    if (best !== null) {
      capacity.set(bestKey, bestCapacity - s.task.estimatedMinutes);
      const k = countKey(bestKey, s.subjectId);
      subjectCount.set(k, (subjectCount.get(k) ?? 0) + 1);
      out.push(
        best.date !== undefined
          ? { dayOfWeek: best.dayOfWeek, date: best.date, suggestion: s }
          : { dayOfWeek: best.dayOfWeek, suggestion: s },
      );
    } else {
      out.push({ dayOfWeek: null, suggestion: s });
    }
  }

  return out;
}
