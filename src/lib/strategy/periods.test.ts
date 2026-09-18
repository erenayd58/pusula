import { describe, expect, it } from "vitest";
import { examProximity, periodFor, suggestSeasonPeriods, type SeasonPeriod } from "./periods";

const periods: SeasonPeriod[] = [
  {
    name: "Yeni konu öğrenme",
    starts_on: "2026-09-14",
    ends_on: "2027-03-20",
    mix: { new_topic: 50, weak: 30, review: 20 },
  },
  {
    name: "Deneme ve eksik kapatma",
    starts_on: "2027-05-09",
    ends_on: "2027-06-13",
    mix: { new_topic: 0, weak: 50, review: 50 },
  },
];

describe("periodFor", () => {
  it("tarihi kapsayan dönemi döner; sınırlar dahil", () => {
    expect(periodFor(periods, "2026-09-14")?.name).toBe("Yeni konu öğrenme");
    expect(periodFor(periods, "2027-03-20")?.name).toBe("Yeni konu öğrenme");
    expect(periodFor(periods, "2027-06-13")?.name).toBe("Deneme ve eksik kapatma");
  });

  it("boşlukta ve dışarıda null; boş liste null", () => {
    expect(periodFor(periods, "2027-04-01")).toBeNull();
    expect(periodFor(periods, "2026-09-13")).toBeNull();
    expect(periodFor(periods, "2027-06-14")).toBeNull();
    expect(periodFor([], "2026-10-01")).toBeNull();
  });
});

describe("suggestSeasonPeriods", () => {
  it("LGS 2027 (13 Haz 2027) için §1.2 tablosunu üretir; ilk başlangıç pazartesiye yuvarlanır", () => {
    const p = suggestSeasonPeriods("2027-06-13");
    expect(p).toHaveLength(3);
    expect(p[0]).toEqual({
      name: "Yeni konu öğrenme",
      starts_on: "2026-09-14",
      ends_on: "2027-03-20",
      mix: { new_topic: 50, weak: 30, review: 20 },
    });
    expect(p[1]).toEqual({
      name: "İkinci tur ve pekiştirme",
      starts_on: "2027-03-21",
      ends_on: "2027-05-08",
      mix: { new_topic: 20, weak: 40, review: 40 },
    });
    expect(p[2]).toEqual({
      name: "Deneme ve eksik kapatma",
      starts_on: "2027-05-09",
      ends_on: "2027-06-13",
      mix: { new_topic: 0, weak: 50, review: 50 },
    });
  });

  it("aralıklar bitişik ve çakışmaz; pazartesi sınavda ilk başlangıç aynı gün kalır", () => {
    // 2027-06-14 pazartesi → sınav − 39 hafta da pazartesi (2026-09-14).
    const p = suggestSeasonPeriods("2027-06-14");
    expect(p[0]!.starts_on).toBe("2026-09-14");
    expect(p[0]!.ends_on < p[1]!.starts_on).toBe(true);
    expect(p[1]!.ends_on < p[2]!.starts_on).toBe(true);
    expect(p[2]!.ends_on).toBe("2027-06-14");
  });
});

describe("examProximity", () => {
  it("120 gün kala 0, 60 gün kala 0,5, sınav günü 1, geçmiş sınav 1", () => {
    expect(examProximity(120, 120)).toBe(0);
    expect(examProximity(200, 120)).toBe(0);
    expect(examProximity(60, 120)).toBe(0.5);
    expect(examProximity(0, 120)).toBe(1);
    expect(examProximity(-10, 120)).toBe(1);
  });

  it("proximityDays 0 ise yalnızca sınav günü ve sonrası 1", () => {
    expect(examProximity(5, 0)).toBe(0);
    expect(examProximity(0, 0)).toBe(1);
  });
});
