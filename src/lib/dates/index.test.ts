import { describe, expect, it } from "vitest";
import {
  dateRangeKeys,
  currentSeason,
  daysUntil,
  greetingFor,
  isoDayOfWeek,
  resolveWeekParam,
  shiftWeek,
  toDateKey,
  todayInIstanbul,
  weekDates,
  weekEnd,
  weekStart,
} from "./index";

describe("lib/dates", () => {
  it("gece 00:30 İstanbul kaydı yeni güne aittir (UTC'de bir önceki gün)", () => {
    // 2026-09-15 21:30 UTC = 2026-09-16 00:30 İstanbul
    const now = new Date("2026-09-15T21:30:00Z");
    expect(toDateKey(now)).toBe("2026-09-16");
    expect(toDateKey(todayInIstanbul(now))).toBe("2026-09-16");
  });

  it("gece 23:30 İstanbul kaydı hâlâ aynı güne aittir", () => {
    // 2026-09-15 20:30 UTC = 2026-09-15 23:30 İstanbul
    expect(toDateKey(new Date("2026-09-15T20:30:00Z"))).toBe("2026-09-15");
  });

  it("hafta pazartesi başlar, pazar biter", () => {
    // 2026-09-20 pazar (İstanbul öğlen)
    const sunday = new Date("2026-09-20T09:00:00Z");
    expect(toDateKey(weekStart(sunday))).toBe("2026-09-14");
    expect(toDateKey(weekEnd(sunday))).toBe("2026-09-20");

    // 2026-09-14 pazartesi 00:30 İstanbul = 2026-09-13 21:30 UTC → aynı hafta
    const mondayEarly = new Date("2026-09-13T21:30:00Z");
    expect(toDateKey(weekStart(mondayEarly))).toBe("2026-09-14");
  });

  it("todayInIstanbul günün başlangıcını verir", () => {
    const d = todayInIstanbul(new Date("2026-09-16T10:15:00Z"));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(toDateKey(d)).toBe("2026-09-16");
  });

  it("sezon temmuzda döner", () => {
    expect(currentSeason(new Date("2026-09-16T10:00:00+03:00"))).toBe("2026-2027");
    expect(currentSeason(new Date("2027-03-01T10:00:00+03:00"))).toBe("2026-2027");
    expect(currentSeason(new Date("2027-07-01T00:30:00+03:00"))).toBe("2027-2028");
  });
  it("daysUntil İstanbul gününe göre tam gün sayar", () => {
    // 2026-09-16 00:30 İstanbul (UTC'de hâlâ 15'i): sınav 2027-06-13 → 270 gün
    expect(daysUntil("2027-06-13", new Date("2026-09-15T21:30:00Z"))).toBe(270);
    expect(daysUntil("2026-09-16", new Date("2026-09-16T20:59:00Z"))).toBe(0);
    expect(daysUntil("2026-09-15", new Date("2026-09-16T05:00:00Z"))).toBe(-1);
  });

  it("greetingFor İstanbul saatine göre selamlar", () => {
    expect(greetingFor(new Date("2026-09-16T05:00:00Z"))).toBe("Günaydın"); // 08:00
    expect(greetingFor(new Date("2026-09-16T10:00:00Z"))).toBe("İyi günler"); // 13:00
    expect(greetingFor(new Date("2026-09-16T16:30:00Z"))).toBe("İyi akşamlar"); // 19:30
    expect(greetingFor(new Date("2026-09-16T00:00:00Z"))).toBe("İyi akşamlar"); // 03:00
  });
});

describe("hafta yardımcıları (Faz 4b)", () => {
  it("resolveWeekParam geçerli pazartesiyi kabul eder, diğerlerinde bu haftaya düşer", () => {
    const now = new Date("2026-09-16T09:00:00Z"); // çarşamba
    expect(resolveWeekParam("2026-09-14", now)).toBe("2026-09-14");
    expect(resolveWeekParam("2026-09-21", now)).toBe("2026-09-21");
    expect(resolveWeekParam("2026-09-15", now)).toBe("2026-09-14"); // salı → bu hafta
    expect(resolveWeekParam("bozuk", now)).toBe("2026-09-14");
    expect(resolveWeekParam(undefined, now)).toBe("2026-09-14");
    expect(resolveWeekParam("2026-02-31", now)).toBe("2026-09-14");
  });

  it("shiftWeek, weekDates ve isoDayOfWeek", () => {
    expect(shiftWeek("2026-09-14", 1)).toBe("2026-09-21");
    expect(shiftWeek("2026-09-14", -1)).toBe("2026-09-07");
    expect(weekDates("2026-09-14")[7]).toBe("2026-09-20");
    expect(isoDayOfWeek(new Date("2026-09-20T09:00:00Z"))).toBe(7);
    expect(isoDayOfWeek(new Date("2026-09-14T09:00:00Z"))).toBe(1);
  });
});

describe("dateRangeKeys (program istisna aralığı)", () => {
  it("iki ucu da dahil sayar, ay ve yaz saati sınırını aşar", () => {
    expect(dateRangeKeys("2026-09-28", "2026-10-02")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
    expect(dateRangeKeys("2026-03-28", "2026-03-30")).toHaveLength(3);
    expect(dateRangeKeys("2026-09-28", "2026-09-28")).toEqual(["2026-09-28"]);
  });

  it("ters aralık ve bozuk tarih boş; limit aşımında limit + 1 anahtar", () => {
    expect(dateRangeKeys("2026-10-02", "2026-09-28")).toEqual([]);
    expect(dateRangeKeys("bozuk", "2026-09-28")).toEqual([]);
    expect(dateRangeKeys("2026-01-01", "2026-12-31", 5)).toHaveLength(6);
  });
});
