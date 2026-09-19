import { addDays, format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { toIstanbul } from "@/lib/dates";

/**
 * Kullanıcıya görünen tüm sayı ve tarih biçimleri (04-tasarim-sistemi.md Bölüm 12.1):
 * `71,33 net` · `1.250 soru` · `%80` · `14 sa 20 dk` · `16 Eylül` · `14 – 20 Eylül`.
 * Negatif sayılar tipografik eksi (U+2212) ile yazılır; değişimler işaretlidir (`+3,67`).
 * Sayı ile birim (ve gün ile ay) arasında bölünmeyen boşluk (U+00A0) vardır; `14 sa 20 dk`
 * ya da `16 Eylül` satır sonunda ikiye bölünmez.
 * Biçimlenmiş metin CSS veya hesap değeri olarak kullanılmaz.
 */

const LOCALE = "tr-TR";
const MINUS = String.fromCharCode(0x2212);
/** Bölünmeyen boşluk (U+00A0): sayı–birim, gün–ay arası. */
export const NBSP = String.fromCharCode(0x00a0);
/** Boşluklu en dash (04 Bölüm 12.1); dash çevresinde satır kırılabilir. */
const RANGE_SEPARATOR = ` ${String.fromCharCode(0x2013)} `;

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

/** Biçimlenmiş sayıya birimi bölünmeyen boşlukla ekler: `withUnit("1.250", "soru")` → `1.250 soru`. */
export function withUnit(formatted: string, unit: string): string {
  return `${formatted}${NBSP}${unit}`;
}

/** Yüzde: girdi 0–100 ölçeğinde sayıdır (oran değil). `80` → `%80`, `71.33` → `%71,3` (1 basamak). */
export function formatPercent(value: number, fractionDigits = 0): string {
  return `%${formatNumber(value, fractionDigits)}`;
}

/**
 * Net: her zaman iki basamak. `71.333` → `71,33`, `-0.5` → `−0,50`.
 * Birim verilirse bölünmeyen boşlukla eklenir: `formatNet(71.333, "net")` → `71,33 net`.
 */
export function formatNet(value: number, unit?: string): string {
  const formatted = formatNumber(value, 2);
  return unit ? withUnit(formatted, unit) : formatted;
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

/**
 * Adet: binlik ayırıcı nokta. `1250` → `1.250`.
 * Birim verilirse bölünmeyen boşlukla eklenir: `formatCount(1250, "soru")` → `1.250 soru`.
 */
export function formatCount(value: number, unit?: string): string {
  const formatted = formatNumber(value, 0);
  return unit ? withUnit(formatted, unit) : formatted;
}

/**
 * Sayıya 3. tekil iyelik eki (ünlü uyumu son söylenen sayıya göre): `9'u`, `12'si`, `3'ü`,
 * `54'ü`, `100'ü`, `1.000'i`. "54 konunun 9'u bitti" gibi cümleler için; binlik ayırıcı korunur.
 */
export function formatPossessive(value: number): string {
  const n = Math.abs(Math.round(value));
  const ones = n % 10;
  const tens = Math.floor(n / 10) % 10;
  let suffix: string;
  if (ones !== 0) {
    suffix = ["ı", "i", "si", "ü", "ü", "i", "sı", "si", "i", "u"][ones]!;
  } else if (tens !== 0) {
    suffix = ["", "u", "si", "u", "ı", "si", "ı", "i", "i", "ı"][tens]!;
  } else if (n % 1000 !== 0) {
    suffix = "ü"; // yüz
  } else if (n % 1_000_000 !== 0) {
    suffix = "i"; // bin
  } else {
    suffix = n === 0 ? "ı" : "u"; // sıfır / milyon
  }
  return `${formatCount(value)}'${suffix}`;
}

const BACK_VOWELS = "aıou";
const FRONT_VOWELS = "eiöü";
const VOWELS = BACK_VOWELS + FRONT_VOWELS;

/**
 * Ada 3. tekil iyelik eki (ilgi hali), kesme işaretiyle: `Ayşe'nin`, `Mehmet'in`, `Can'ın`,
 * `Ömer'in`, `Buğra'nın`, `Umut'un`, `Gül'ün`. Son harf ünlüyse kaynaştırma "n"; ek son ünlüye göre
 * (a/ı → ın, e/i → in, o/u → un, ö/ü → ün). Ünlü yoksa "in". Boş ad olduğu gibi döner.
 */
export function formatNamePossessive(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") return name;
  const lower = trimmed.toLocaleLowerCase("tr-TR");
  const last = lower.at(-1) ?? "";
  const lastVowel = [...lower].reverse().find((ch) => VOWELS.includes(ch)) ?? "i";
  const vowel = "aı".includes(lastVowel)
    ? "ı"
    : "ou".includes(lastVowel)
      ? "u"
      : "öü".includes(lastVowel)
        ? "ü"
        : "i";
  const buffer = VOWELS.includes(last) ? "n" : "";
  return `${trimmed}'${buffer}${vowel}n`;
}

/**
 * Süre (dakika): `860` → `14 sa 20 dk`, `45` → `45 dk`, `120` → `2 sa`, `0` → `0 dk`.
 * Tüm boşluklar bölünmeyen boşluktur; süre tek satırda kalır.
 */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours > 0 && rest > 0) {
    return `${withUnit(formatCount(hours), "sa")}${NBSP}${withUnit(String(rest), "dk")}`;
  }
  if (hours > 0) return withUnit(formatCount(hours), "sa");
  return withUnit(String(rest), "dk");
}

/* date-fns desenlerinde tek tırnak içi literal: gün–ay (ve ay–yıl) arası bölünmeyen boşluk. */
const DAY_MONTH = `d'${NBSP}'MMMM`;
const DAY_MONTH_YEAR = `d'${NBSP}'MMMM'${NBSP}'yyyy`;

/**
 * Tarih, İstanbul saat diliminde: `16 Eylül`; `{ year: true }` ile `16 Eylül 2026`;
 * `{ weekday: true }` ile `Çarşamba, 16 Eylül`. Gün–ay arası bölünmez.
 */
export function formatDateTr(
  date: Date | number | string,
  options?: { year?: boolean; weekday?: boolean },
): string {
  const pattern = options?.year ? DAY_MONTH_YEAR : DAY_MONTH;
  return format(toIstanbul(date), options?.weekday ? `EEEE, ${pattern}` : pattern, { locale: tr });
}

/** Saat, İstanbul: `14:02` (otomatik kayıt zamanı gibi). */
export function formatTimeTr(date: Date | number | string): string {
  return format(toIstanbul(date), "HH:mm");
}

/**
 * Hafta aralığı (pazartesi → pazar): `14 – 20 Eylül`; ay değişirse `28 Eylül – 4 Ekim`;
 * yıl değişirse `29 Aralık 2026 – 4 Ocak 2027`. `{ year: true }` ile yıl her zaman yazılır.
 * Gün–ay arası bölünmez; satır yalnızca dash çevresinde kırılabilir.
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
    return `${format(start, DAY_MONTH_YEAR, { locale: tr })}${RANGE_SEPARATOR}${format(end, DAY_MONTH_YEAR, { locale: tr })}`;
  }
  const endPattern = showYear ? DAY_MONTH_YEAR : DAY_MONTH;
  const startPattern = sameMonth ? "d" : DAY_MONTH;
  return `${format(start, startPattern, { locale: tr })}${RANGE_SEPARATOR}${format(end, endPattern, { locale: tr })}`;
}
