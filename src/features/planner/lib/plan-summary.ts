/**
 * Plan özet hesapları (08 §3.3): gün/hafta toplamı, uyum yüzdesi, gün başına aşım.
 * Uyum tanımı `v_plan_completion` ile aynıdır: tamamlanan / toplam (gün atanmamış görevler
 * dahil), görev yoksa null. Erteleme yüzdeyi etkilemez.
 */

export type SummaryItem = {
  dayOfWeek: number | null;
  estimatedMinutes: number;
  completedAt: string | null;
  postponedAt?: string | null;
};

export function completionPercent(items: readonly SummaryItem[]): number | null {
  if (items.length === 0) return null;
  const done = items.filter((i) => i.completedAt !== null).length;
  return Math.floor((done * 100) / items.length);
}

export function completedCount(items: readonly SummaryItem[]): number {
  return items.filter((i) => i.completedAt !== null).length;
}

export function postponedCount(items: readonly SummaryItem[]): number {
  return items.filter((i) => i.postponedAt).length;
}

/** Bir günün (null = bu hafta içinde) planlanan toplam dakikası. */
export function dayMinutes(items: readonly SummaryItem[], dayOfWeek: number | null): number {
  return items
    .filter((i) => i.dayOfWeek === dayOfWeek)
    .reduce((sum, i) => sum + i.estimatedMinutes, 0);
}

/** Hafta toplamı: tüm görevlerin dakikası ve (soru görevlerinin) soru sayısı. */
export function weekTotals(items: readonly (SummaryItem & { questions?: number | null })[]): {
  minutes: number;
  questions: number;
  count: number;
} {
  return items.reduce(
    (acc, i) => ({
      minutes: acc.minutes + i.estimatedMinutes,
      questions: acc.questions + (i.questions ?? 0),
      count: acc.count + 1,
    }),
    { minutes: 0, questions: 0, count: 0 },
  );
}

/** Planlanan süre müsait süreyi aşıyor mu (nötr uyarı; engel değil). */
export function isOverbooked(plannedMinutes: number, availableMinutes: number): boolean {
  return plannedMinutes > availableMinutes;
}
