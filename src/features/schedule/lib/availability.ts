import { addDays } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { busySlotKindLabels } from "@/content/labels";
import { TIME_ZONE, toDateKey } from "@/lib/dates";
import type { BusySlotKind } from "@/types";

/**
 * Müsait süre hesabı (08 §2 Parça 1): uyanık aralık eksi meşguliyetler; çakışan aralıklar
 * birleştirilir. Saf fonksiyonlar, dakika çözünürlüğü (gece yarısından dakika, 0–1440).
 * Faz 5'te `wake` öğrenci başına verilebilir, istisnalar takvimden gelebilir; imzalar değişmez.
 */

export type Minute = number;
export type Interval = { start: Minute; end: Minute };

export type BusySlotInput = {
  dayOfWeek: number;
  /** `SS:DD` ya da `SS:DD:SS` (Postgres `time`). */
  startsAt: string;
  endsAt: string;
  kind: BusySlotKind;
  note: string | null;
};

export type ScheduleExceptionInput = {
  /** `YYYY-MM-DD` */
  onDate: string;
  /** İkisi de boşsa tüm gün. */
  startsAt: string | null;
  endsAt: string | null;
  title: string;
};

export type BusyBlock = Interval & { label: string; kind: BusySlotKind | "exception" };

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DayAvailability = {
  date: string;
  dayOfWeek: DayOfWeek;
  /** Gösterim için, birleştirilmemiş ve başlangıca göre sıralı. */
  busy: BusyBlock[];
  availableMinutes: number;
  allDayBusy: boolean;
};

export const DAY_MINUTES = 24 * 60;

/** `"08:30"` / `"08:30:00"` → 510. Geçersiz metinde 0. */
export function timeToMinutes(time: string): Minute {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 510 → `"08:30"`. */
export function minutesToTime(minutes: Minute): string {
  const m = Math.max(0, Math.min(DAY_MINUTES, Math.round(minutes)));
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Kurum ayarındaki `SS:DD` çiftinden uyanık aralık. */
export function wakeInterval(wake: { wake_start: string; wake_end: string }): Interval {
  return { start: timeToMinutes(wake.wake_start), end: timeToMinutes(wake.wake_end) };
}

/** Sıralar; çakışan ve bitişik aralıkları tek aralıkta birleştirir. Boş/ters aralıklar atılır. */
export function mergeIntervals(list: readonly Interval[]): Interval[] {
  const sorted = list
    .filter((i) => i.end > i.start)
    .map((i) => ({ start: i.start, end: i.end }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Interval[] = [];
  for (const cur of sorted) {
    const last = merged[merged.length - 1];
    if (last && cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

/** Aralıkları pencereye kırpar; pencere dışında kalanları atar. */
export function clipToWindow(list: readonly Interval[], window: Interval): Interval[] {
  return list
    .map((i) => ({ start: Math.max(i.start, window.start), end: Math.min(i.end, window.end) }))
    .filter((i) => i.end > i.start);
}

/** Pencere içindeki boş dakika: pencere uzunluğu eksi (kırpılmış, birleştirilmiş) meşguliyet. */
export function availableMinutes(window: Interval, busy: readonly Interval[]): number {
  const total = Math.max(0, window.end - window.start);
  const used = mergeIntervals(clipToWindow(busy, window)).reduce(
    (sum, i) => sum + (i.end - i.start),
    0,
  );
  return Math.max(0, total - used);
}

/**
 * Haftanın 7 günü için müsait süre. Tüm gün istisna → 0 dakika; saatli istisna meşguliyet gibi
 * düşülür. Meşguliyetler uyanık aralığa kırpılarak sayılır, ama listede olduğu gibi görünür.
 */
export function availabilityForWeek(input: {
  /** `YYYY-MM-DD`, pazartesi. */
  weekStart: string;
  wake: Interval;
  slots: readonly BusySlotInput[];
  exceptions: readonly ScheduleExceptionInput[];
}): DayAvailability[] {
  const monday = new TZDate(input.weekStart, TIME_ZONE);
  const days: DayAvailability[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const dayOfWeek = (offset + 1) as DayOfWeek;
    const date = toDateKey(addDays(monday, offset));
    const exceptions = input.exceptions.filter((e) => e.onDate === date);
    const allDayBusy = exceptions.some((e) => e.startsAt === null || e.endsAt === null);

    const busy: BusyBlock[] = [
      ...input.slots
        .filter((s) => s.dayOfWeek === dayOfWeek)
        .map((s) => ({
          start: timeToMinutes(s.startsAt),
          end: timeToMinutes(s.endsAt),
          label: s.note?.trim() || busySlotKindLabels[s.kind],
          kind: s.kind,
        })),
      ...exceptions.map((e) => ({
        start: e.startsAt === null ? 0 : timeToMinutes(e.startsAt),
        end: e.endsAt === null ? DAY_MINUTES : timeToMinutes(e.endsAt),
        label: e.title,
        kind: "exception" as const,
      })),
    ].sort((a, b) => a.start - b.start || a.end - b.end);

    days.push({
      date,
      dayOfWeek,
      busy,
      availableMinutes: allDayBusy ? 0 : availableMinutes(input.wake, busy),
      allDayBusy,
    });
  }
  return days;
}
