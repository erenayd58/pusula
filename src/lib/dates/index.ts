import { TZDate } from "@date-fns/tz";
import { addDays, differenceInCalendarDays, format, startOfDay, startOfWeek } from "date-fns";

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

/**
 * Öğretim yılı etiketi (`2026-2027`). Yıl temmuzda döner: temmuz-aralık → `Y-(Y+1)`,
 * ocak-haziran → `(Y-1)-Y`. Sadece form ön dolgusu; sezon verisi öğrencide saklanır.
 */
export function currentSeason(now: Date = new Date()): string {
  const d = toIstanbul(now);
  const year = d.getFullYear();
  const startYear = d.getMonth() + 1 >= 7 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/**
 * `YYYY-MM-DD` (veritabanı `date`) tarihine İstanbul bugününden kalan tam gün sayısı.
 * Bugün → 0, geçmiş → negatif. Sınav geri sayımı için.
 */
export function daysUntil(dateKey: string, now: Date = new Date()): number {
  const target = new TZDate(dateKey, TIME_ZONE);
  return differenceInCalendarDays(target, todayInIstanbul(now));
}

/**
 * Verilen tarih ya da zaman damgasından `todayKey` (YYYY-MM-DD, İstanbul günü) gününe geçen tam
 * gün sayısı; aynı gün → 0, gelecek → negatif. Uyarı kuralları ("12 gündür bakılmadı") için.
 */
export function daysSince(value: Date | number | string, todayKey: string): number {
  return differenceInCalendarDays(new TZDate(todayKey, TIME_ZONE), toIstanbul(value));
}

/** Saate göre selamlama (İstanbul): 05–12 Günaydın, 12–18 İyi günler, sonrası İyi akşamlar. */
export function greetingFor(now: Date = new Date()): string {
  const hour = toIstanbul(now).getHours();
  if (hour >= 5 && hour < 12) return "Günaydın";
  if (hour >= 12 && hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

/** Hafta anahtarına (`YYYY-MM-DD`, pazartesi) hafta ekler/çıkarır. */
export function shiftWeek(weekKey: string, weeks: number): string {
  return toDateKey(addDays(new TZDate(weekKey, TIME_ZONE), weeks * 7));
}

/**
 * `?week=` parametresi: geçerli bir pazartesi anahtarıysa onu, değilse İstanbul'a göre bu
 * haftanın pazartesisini döner (hatalı/eksik parametre sessizce bu haftaya düşer).
 */
export function resolveWeekParam(value: string | undefined, now: Date = new Date()): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new TZDate(value, TIME_ZONE);
    if (!Number.isNaN(d.getTime()) && toDateKey(d) === value && d.getDay() === 1) return value;
  }
  return toDateKey(weekStart(todayInIstanbul(now)));
}

/** Haftanın 7 günü: gün (1 = pazartesi) → tarih anahtarı. */
export function weekDates(weekKey: string): Record<number, string> {
  const monday = new TZDate(weekKey, TIME_ZONE);
  const out: Record<number, string> = {};
  for (let i = 0; i < 7; i++) out[i + 1] = toDateKey(addDays(monday, i));
  return out;
}

/** ISO haftanın günü (1 = pazartesi … 7 = pazar), İstanbul'a göre. */
export function isoDayOfWeek(date: Date | number | string = new Date()): number {
  return ((toIstanbul(date).getDay() + 6) % 7) + 1;
}
