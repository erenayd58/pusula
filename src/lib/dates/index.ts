import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfDay, startOfWeek } from "date-fns";

/**
 * Tüm "bugün", hafta ve tarih hesapları bu dosyadan geçer (02-mimari Bölüm 5).
 * Saat dilimi Europe/Istanbul, hafta pazartesi başlar. Bileşenlerde doğrudan
 * `new Date().toLocaleDateString()` kullanılmaz.
 */
export const TIME_ZONE = "Europe/Istanbul";

/** Hafta pazartesi başlar. */
export const WEEK_STARTS_ON = 1;

/** Verilen anı İstanbul saat diliminde temsil eden tarih nesnesi. */
export function toIstanbul(date: Date | number | string): TZDate {
  return new TZDate(new Date(date).getTime(), TIME_ZONE);
}

/** İstanbul'a göre bugünün başlangıcı (00:00). Gece 00:30'da girilen kayıt yeni güne aittir. */
export function todayInIstanbul(now: Date = new Date()): TZDate {
  return startOfDay(toIstanbul(now));
}

/** Verilen tarihin İstanbul'a göre haftasının pazartesi 00:00'ı. */
export function weekStart(date: Date | number | string): TZDate {
  return startOfWeek(toIstanbul(date), { weekStartsOn: WEEK_STARTS_ON });
}

/** Aynı haftanın pazar günü 00:00'ı (haftanın son günü). */
export function weekEnd(date: Date | number | string): TZDate {
  return addDays(weekStart(date), 6);
}

/** Veritabanındaki `date` kolonları için İstanbul'a göre `YYYY-MM-DD` anahtarı. */
export function toDateKey(date: Date | number | string): string {
  return format(toIstanbul(date), "yyyy-MM-dd");
}
