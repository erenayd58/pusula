import { TZDate } from "@date-fns/tz";
import { addDays, addWeeks } from "date-fns";
import { TIME_ZONE, toDateKey } from "@/lib/dates";

/**
 * Sezon dönemleri (09-faz5-strateji.md §1.2, karar B2/B3). Saf: yapısal tip alır, hiçbir
 * `features/*` dosyasını import etmez. Tarihler `YYYY-MM-DD`; hafta pazartesi başlar.
 */

/** Öneri karışımı, yüzde; toplam 100. */
export type PeriodMix = { new_topic: number; weak: number; review: number };

export type SeasonPeriod = { name: string; starts_on: string; ends_on: string; mix: PeriodMix };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Tarihi kapsayan ilk dönem (aralıklar çakışmaz, boşluk olabilir); yoksa null. */
export function periodFor(periods: readonly SeasonPeriod[], date: string): SeasonPeriod | null {
  return periods.find((p) => p.starts_on <= date && date <= p.ends_on) ?? null;
}

/** Aynı gün ya da sonraki pazartesi (§1.2: ilk dönemin başlangıcı pazartesiye yuvarlanır). */
function nextMonday(date: TZDate): TZDate {
  const dow = date.getDay(); // 0 pazar … 1 pazartesi
  const offset = dow === 1 ? 0 : (8 - dow) % 7;
  return addDays(date, offset);
}

/**
 * Sınav tarihine göre üç dönem önerisi (§1.2 tablosu): yeni konu öğrenme (sınav − 39 hafta,
 * pazartesiye yuvarlanır → sınav − 12 hafta − 1 gün; 50/30/20), ikinci tur ve pekiştirme
 * (→ sınav − 5 hafta − 1 gün; 20/40/40), deneme ve eksik kapatma (→ sınav günü; 0/50/50).
 * Ayar formundaki "Varsayılanları öner" düğmesi bunu kullanır; owner düzenler ve kaydeder.
 */
export function suggestSeasonPeriods(examDate: string): SeasonPeriod[] {
  const exam = new TZDate(examDate, TIME_ZONE);
  const p1Start = nextMonday(addWeeks(exam, -39));
  const p2Start = addWeeks(exam, -12);
  const p3Start = addWeeks(exam, -5);
  return [
    {
      name: "Yeni konu öğrenme",
      starts_on: toDateKey(p1Start),
      ends_on: toDateKey(addDays(p2Start, -1)),
      mix: { new_topic: 50, weak: 30, review: 20 },
    },
    {
      name: "İkinci tur ve pekiştirme",
      starts_on: toDateKey(p2Start),
      ends_on: toDateKey(addDays(p3Start, -1)),
      mix: { new_topic: 20, weak: 40, review: 40 },
    },
    {
      name: "Deneme ve eksik kapatma",
      starts_on: toDateKey(p3Start),
      ends_on: toDateKey(exam),
      mix: { new_topic: 0, weak: 50, review: 50 },
    },
  ];
}

/**
 * Sınav yakınlığı rampası (karar B9): `clamp01(1 − kalanGün / proximityDays)`; `proximityDays`
 * gün ve öncesinde 0, sınav günü ve sonrasında 1.
 */
export function examProximity(daysToExam: number, proximityDays: number): number {
  if (proximityDays <= 0) return daysToExam <= 0 ? 1 : 0;
  return clamp01(1 - daysToExam / proximityDays);
}
