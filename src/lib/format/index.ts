import { addDays, format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { toIstanbul } from "@/lib/dates";

/**
 * Kullanıcıya görünen tüm sayı ve tarih biçimleri (04-tasarim-sistemi.md Bölüm 12.1):
 * `71,33 net` · `1.250 soru` · `%80` · `14 sa 20 dk` · `16 Eylül` · `14 – 20 Eylül`.
 * Negatif sayılar tipografik eksi (U+2212) ile yazılır; değişimler işaretlidir (`+3,67`).
 * Biçimlenmiş metin CSS veya hesap değeri olarak kullanılmaz.
 */

const LOCALE = "tr-TR";
const MINUS = "−";
/** Boşluklu en dash (04 Bölüm 12.1). */
const RANGE_SEPARATOR = " – ";

/**
 * Intl çıktısındaki eksi işaretini U+2212'ye çevirir; yuvarlama sonucu sıfıra düşen
 * negatif değerlerde ("-0,00") işareti kaldırır.
 */
function normalizeSign(formatted: string): string {
  const match = /^[-−]/.exec(formatted);
  if (!match) return formatted;
  const body = formatted.slice(1);
  const isZero = !/[1-9]/.test(body);
  return isZero ? body : `${MINUS}${body}`;
}

function formatNumber(value: number, fractionDigits: number): string {
  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
  return normalizeSign(formatted);
}

/** Yüzde: girdi 0–100 ölçeğinde sayıdır (oran değil). `80` → `%80`, `71.33` → `%71,3` (1 basamak). */
export function formatPercent(value: number, fractionDigits = 0): string {
  return `%${formatNumber(value, fractionDigits)}`;
}

/** Net: her zaman iki basamak. `71.333` → `71,33`, `-0.5` → `−0,50`. */
export function formatNet(value: number): string {
  return formatNumber(value, 2);
}

/**
 * İşaretli değişim / trend: `3.67` → `+3,67`, `-0.5` → `−0,50`, `0` → `0,00`.
 * İşaret yuvarlanmış değere göre belirlenir (`-0.001` → `0,00`).
 */
export function formatSigned(value: number, fractionDigits = 2): string {
  const formatted = formatNumber(value, fractionDigits);
  if (formatted.startsWith(MINUS)) return formatted;
  const isZero = !/[1-9]/.test(formatted);
  return isZero ? formatted : `+${formatted}`;
}

/** Adet: binlik ayırıcı nokta. `1250` → `1.250`. */
export function formatCount(value: number): string {
  return formatNumber(value, 0);
}

/** Süre (dakika): `860` → `14 sa 20 dk`, `45` → `45 dk`, `120` → `2 sa`, `0` → `0 dk`. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours > 0 && rest > 0) return `${formatCount(hours)} sa ${rest} dk`;
  if (hours > 0) return `${formatCount(hours)} sa`;
  return `${rest} dk`;
}

/** Tarih, İstanbul saat diliminde: `16 Eylül`; `{ year: true }` ile `16 Eylül 2026`. */
export function formatDateTr(date: Date | number | string, options?: { year?: boolean }): string {
  return format(toIstanbul(date), options?.year ? "d MMMM yyyy" : "d MMMM", { locale: tr });
}

/**
 * Hafta aralığı (pazartesi → pazar): `14 – 20 Eylül`; ay değişirse `28 Eylül – 4 Ekim`;
 * yıl değişirse `29 Aralık 2026 – 4 Ocak 2027`. `{ year: true }` ile yıl her zaman yazılır.
 * Girdi haftanın ilk günüdür (bkz. `weekStart`).
 */
export function formatWeekRange(
  weekStartDate: Date | number | string,
  options?: { year?: boolean },
): string {
  const start = toIstanbul(weekStartDate);
  const end = addDays(start, 6);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const showYear = options?.year === true;

  if (!sameYear) {
    return `${format(start, "d MMMM yyyy", { locale: tr })}${RANGE_SEPARATOR}${format(end, "d MMMM yyyy", { locale: tr })}`;
  }
  const endPattern = showYear ? "d MMMM yyyy" : "d MMMM";
  const startPattern = sameMonth ? "d" : "d MMMM";
  return `${format(start, startPattern, { locale: tr })}${RANGE_SEPARATOR}${format(end, endPattern, { locale: tr })}`;
}
