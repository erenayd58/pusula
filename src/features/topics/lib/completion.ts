import type { TopicStatus } from "@/types";

/** Tamamlanma sayımında "bitti" sayılan durumlar (04 Bölüm 9: tamamlandı + oturdu). */
export const DONE_STATUSES: readonly TopicStatus[] = ["completed", "mastered"];

export function isDone(status: TopicStatus): boolean {
  return DONE_STATUSES.includes(status);
}

export function countDone(statuses: readonly TopicStatus[]): number {
  return statuses.filter(isDone).length;
}

/** done / total → 0-100 arası tam sayı (yuvarlanır); total 0 ise 0. Hesap değeri, metin değil. */
export function percentOf(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/** Tamamlanma yüzdesi: (tamamlandı + oturdu) / toplam. Görünen metin `formatPercent` ile. */
export function completionPercent(statuses: readonly TopicStatus[]): number {
  return percentOf(countDone(statuses), statuses.length);
}
