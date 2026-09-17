import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";
import { TIME_ZONE, toDateKey } from "./index";

/**
 * Seri: bugün veya dün biten ardışık kayıt günü sayısı. Bugün henüz kayıt yoksa dünkü seri
 * korunur (gün bitmedi); dün de yoksa 0. `dateKeys` sıra ve tekrar bağımsız `YYYY-MM-DD`
 * anahtarlarıdır (v_student_daily_summary.day), `todayKey` İstanbul bugünü.
 */
export function streakFrom(dateKeys: Iterable<string>, todayKey: string): number {
  const days = new Set(dateKeys);
  let cursor = new TZDate(todayKey, TIME_ZONE);
  if (!days.has(todayKey)) {
    cursor = addDays(cursor, -1);
    if (!days.has(toDateKey(cursor))) return 0;
  }
  let count = 0;
  while (days.has(toDateKey(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}
