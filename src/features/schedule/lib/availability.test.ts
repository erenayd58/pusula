import { describe, expect, it } from "vitest";
import {
  availabilityForWeek,
  availableMinutes,
  clipToWindow,
  mergeIntervals,
  minutesToTime,
  timeToMinutes,
  wakeInterval,
} from "./availability";

const WAKE = wakeInterval({ wake_start: "08:00", wake_end: "22:00" }); // 14 saat = 840 dk

describe("timeToMinutes / minutesToTime", () => {
  it("SS:DD ve Postgres SS:DD:SS biçimlerini okur", () => {
    expect(timeToMinutes("08:30")).toBe(510);
    expect(timeToMinutes("08:30:00")).toBe(510);
    expect(timeToMinutes("bozuk")).toBe(0);
    expect(minutesToTime(510)).toBe("08:30");
    expect(minutesToTime(0)).toBe("00:00");
  });
});

describe("mergeIntervals", () => {
  it("çakışan ve bitişik aralıkları birleştirir, sıralar", () => {
    expect(
      mergeIntervals([
        { start: 600, end: 660 },
        { start: 480, end: 540 },
        { start: 540, end: 620 },
      ]),
    ).toEqual([{ start: 480, end: 660 }]);
  });

  it("ayrık aralıkları korur, ters aralığı atar", () => {
    expect(
      mergeIntervals([
        { start: 900, end: 960 },
        { start: 480, end: 540 },
        { start: 700, end: 650 },
      ]),
    ).toEqual([
      { start: 480, end: 540 },
      { start: 900, end: 960 },
    ]);
  });
});

describe("clipToWindow / availableMinutes", () => {
  it("uyanık aralık dışına taşan meşguliyeti kırpar", () => {
    expect(clipToWindow([{ start: 420, end: 540 }], WAKE)).toEqual([{ start: 480, end: 540 }]);
    expect(clipToWindow([{ start: 1330, end: 1400 }], WAKE)).toEqual([]);
  });

  it("boş günde müsait süre uyanık aralığın tamamıdır", () => {
    expect(availableMinutes(WAKE, [])).toBe(840);
  });

  it("çakışan meşguliyetleri iki kez saymaz", () => {
    // 08:30–15:00 okul + 14:00–16:00 kurs → 08:30–16:00 = 450 dk meşgul → 390 müsait
    expect(
      availableMinutes(WAKE, [
        { start: 510, end: 900 },
        { start: 840, end: 960 },
      ]),
    ).toBe(390);
  });
});

describe("availabilityForWeek", () => {
  const slots = [
    { dayOfWeek: 1, startsAt: "08:30:00", endsAt: "15:00:00", kind: "school" as const, note: null },
    {
      dayOfWeek: 1,
      startsAt: "17:00:00",
      endsAt: "19:00:00",
      kind: "course" as const,
      note: "Kurs",
    },
    { dayOfWeek: 3, startsAt: "07:00:00", endsAt: "09:00:00", kind: "other" as const, note: "" },
  ];

  it("7 gün üretir; pazartesi tarihleri İstanbul haftasına göre", () => {
    const days = availabilityForWeek({
      weekStart: "2026-09-14",
      wake: WAKE,
      slots,
      exceptions: [],
    });
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.date)).toEqual([
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
      "2026-09-19",
      "2026-09-20",
    ]);
    expect(days.map((d) => d.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("günün meşguliyetlerini düşer; not boşsa tür etiketi kullanılır", () => {
    const [mon, , wed] = availabilityForWeek({
      weekStart: "2026-09-14",
      wake: WAKE,
      slots,
      exceptions: [],
    });
    // Pazartesi: 390 okul + 120 kurs = 510 → 330 müsait
    expect(mon?.availableMinutes).toBe(330);
    expect(mon?.busy.map((b) => b.label)).toEqual(["Okul", "Kurs"]);
    // Çarşamba: 07:00–09:00 yalnızca 08:00–09:00 kısmı sayılır → 780
    expect(wed?.availableMinutes).toBe(780);
    expect(wed?.busy[0]?.label).toBe("Diğer");
    expect(wed?.busy[0]?.kind).toBe("other");
  });

  it("tüm gün istisna müsait süreyi sıfırlar; saatli istisna meşguliyet gibi düşülür", () => {
    const days = availabilityForWeek({
      weekStart: "2026-09-14",
      wake: WAKE,
      slots,
      exceptions: [
        { onDate: "2026-09-15", startsAt: null, endsAt: null, title: "Yazılı: Fen" },
        { onDate: "2026-09-17", startsAt: "13:00:00", endsAt: "15:00:00", title: "Okul gezisi" },
        { onDate: "2026-09-28", startsAt: null, endsAt: null, title: "Başka hafta" },
      ],
    });
    const tue = days[1];
    const thu = days[3];
    expect(tue?.allDayBusy).toBe(true);
    expect(tue?.availableMinutes).toBe(0);
    expect(tue?.busy).toEqual([{ start: 0, end: 1440, label: "Yazılı: Fen", kind: "exception" }]);
    expect(thu?.allDayBusy).toBe(false);
    expect(thu?.availableMinutes).toBe(720);
    expect(days.filter((d) => d.busy.some((b) => b.label === "Başka hafta"))).toHaveLength(0);
  });

  it("uyanık aralık öğrenci başına verilebilir (Faz 5 kancası)", () => {
    const narrow = wakeInterval({ wake_start: "10:00", wake_end: "20:00" });
    const [mon] = availabilityForWeek({
      weekStart: "2026-09-14",
      wake: narrow,
      slots,
      exceptions: [],
    });
    // 10:00–20:00 = 600; okul 10:00–15:00 = 300, kurs 17:00–19:00 = 120 → 180
    expect(mon?.availableMinutes).toBe(180);
  });
});
