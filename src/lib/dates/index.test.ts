import { describe, expect, it } from "vitest";
import { currentSeason, toDateKey, todayInIstanbul, weekEnd, weekStart } from "./index";

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
});
