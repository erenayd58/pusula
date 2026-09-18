import { TZDate } from "@date-fns/tz";
import { addWeeks, differenceInCalendarDays } from "date-fns";
import { TIME_ZONE, toDateKey, weekStart } from "@/lib/dates";

/**
 * Müfredat takvimi yardımcıları (09-faz5-strateji.md §1.3, karar B1): `topics.school_finish_on`
 * tarih tutar, arayüz haftayı gösterir, toplu doldurma pazartesi yazar. Saf; tarih hesapları
 * `lib/dates` (İstanbul, hafta pazartesi).
 */

function mondayOf(dateKey: string): TZDate {
  return weekStart(new TZDate(dateKey, TIME_ZONE));
}

/**
 * `count` konuyu `[from, to]` haftalarına eşit aralıkla dağıtır; her konuya kendi payının son
 * haftasının pazartesisi yazılır (k. konu k. dilimin sonunda biter). `skip` aralığına (ara tatil)
 * düşen haftalar atlanır. Konu sayısı uygun hafta sayısını aşarsa pazartesiler tekrar eder (aynı
 * hafta birden fazla konu). Uygun hafta yoksa ya da `to < from` ise boş dizi.
 */
export function distributeEvenly(input: {
  count: number;
  from: string;
  to: string;
  skip?: { from: string; to: string } | null;
}): string[] {
  const { count, skip } = input;
  if (count <= 0 || input.to < input.from) return [];

  const first = mondayOf(input.from);
  const last = mondayOf(input.to);
  const skipFirst = skip && skip.to >= skip.from ? toDateKey(mondayOf(skip.from)) : null;
  const skipLast = skip && skip.to >= skip.from ? toDateKey(mondayOf(skip.to)) : null;

  const mondays: string[] = [];
  for (let m = first; m.getTime() <= last.getTime(); m = addWeeks(m, 1)) {
    const key = toDateKey(m);
    if (skipFirst !== null && skipLast !== null && skipFirst <= key && key <= skipLast) continue;
    mondays.push(key);
  }
  const n = mondays.length;
  if (n === 0) return [];

  // k. konunun payı (k × n / count). hafta içinde biter: o haftanın pazartesisi.
  return Array.from({ length: count }, (_, i) => {
    const idx = Math.ceil(((i + 1) * n) / count) - 1;
    return mondays[Math.min(Math.max(idx, 0), n - 1)]!;
  });
}

/**
 * Okulun konuyu bitirdiği haftadan bugünün haftasına geçen tam hafta sayısı:
 * `floor((weekStart(today) − weekStart(schoolFinishOn)) / 7)`. Aynı hafta 0, gelecek negatif.
 */
export function schoolLagWeeks(schoolFinishOn: string, today: string): number {
  return Math.floor(differenceInCalendarDays(mondayOf(today), mondayOf(schoolFinishOn)) / 7);
}
