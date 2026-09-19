import { describe, expect, it } from "vitest";
import { NBSP } from "@/lib/format";
import {
  autoBlank,
  netDeltas,
  recentSubjectWrong,
  topicMarkCounts,
  totalNet,
  trendSummary,
  type MockPoint,
  type SubjectNet,
} from "./mock";

const subject = (id: string, wrong: number, net: number): SubjectNet => ({
  subjectId: id,
  correct: 0,
  wrong,
  blank: 0,
  net,
  questionCount: 20,
});

const point = (
  resultId: string,
  takenOn: string,
  totalNet: number,
  opts: { isBranch?: boolean; subjects?: SubjectNet[] } = {},
): MockPoint => ({
  resultId,
  title: resultId,
  takenOn,
  isBranch: opts.isBranch ?? false,
  totalNet,
  subjects: opts.subjects ?? [],
});

describe("autoBlank", () => {
  it("soru sayısından doğru ve yanlışı düşer", () => {
    expect(autoBlank(20, 15, 3)).toBe(2);
    expect(autoBlank(20, 20, 0)).toBe(0);
  });
  it("soru sayısı yoksa ya da aşılırsa null", () => {
    expect(autoBlank(null, 5, 3)).toBeNull();
    expect(autoBlank(20, 15, 6)).toBeNull();
  });
});

describe("totalNet", () => {
  it("ders netlerini toplar, iki basamağa yuvarlar", () => {
    expect(totalNet([subject("a", 0, 16), subject("b", 0, 18.67), subject("c", 0, 0.333)])).toBe(
      35,
    );
    expect(totalNet([subject("a", 0, 14.333), subject("b", 0, 18.333)])).toBe(32.67);
    expect(totalNet([])).toBe(0);
  });
});

describe("netDeltas", () => {
  it("önceki genel denemeye göre değişim; ilk ve branş null", () => {
    const deltas = netDeltas([
      point("r1", "2026-08-01", 52),
      point("b1", "2026-08-10", 15, { isBranch: true }),
      point("r2", "2026-08-20", 58.33),
      point("r3", "2026-09-01", 55.67),
    ]);
    expect(deltas.get("r1")).toBeNull();
    expect(deltas.get("b1")).toBeNull();
    expect(deltas.get("r2")).toBe(6.33);
    expect(deltas.get("r3")).toBe(-2.66);
  });
  it("branş denemesi zinciri bozmaz", () => {
    const deltas = netDeltas([
      point("r1", "2026-08-01", 50),
      point("b1", "2026-08-10", 15, { isBranch: true }),
      point("r2", "2026-08-20", 53),
    ]);
    expect(deltas.get("r2")).toBe(3);
  });
});

describe("trendSummary", () => {
  it("artış, düşüş ve değişmeme cümleleri", () => {
    const rising = [
      point("r1", "2026-08-01", 52),
      point("r2", "2026-08-15", 58.33),
      point("r3", "2026-08-29", 55.67),
      point("r4", "2026-09-05", 63.33),
      point("r5", "2026-09-12", 65),
    ];
    expect(trendSummary(rising)).toBe("Beş denemede toplam net 13,00 arttı.");
    expect(trendSummary([point("r1", "2026-08-01", 52), point("r2", "2026-08-15", 49.67)])).toBe(
      "İki denemede toplam net 2,33 düştü.",
    );
    expect(trendSummary([point("r1", "2026-08-01", 52), point("r2", "2026-08-15", 52)])).toBe(
      "İki denemede toplam net değişmedi.",
    );
  });
  it("tek ya da hiç deneme; branş sayılmaz; on üstü rakamla", () => {
    expect(trendSummary([point("r1", "2026-08-01", 52)])).toBe("Bir deneme girildi.");
    expect(trendSummary([])).toBe("Henüz deneme yok.");
    expect(
      trendSummary([
        point("r1", "2026-08-01", 52),
        point("b1", "2026-08-10", 10, { isBranch: true }),
      ]),
    ).toBe("Bir deneme girildi.");
    const many = Array.from({ length: 12 }, (_, i) =>
      point(`r${i}`, `2026-08-${String(i + 1).padStart(2, "0")}`, 50 + i),
    );
    expect(trendSummary(many)).toBe("12 denemede toplam net 11,00 arttı.");
  });
});

describe("topicMarkCounts", () => {
  it("yalnızca pencere içindeki sonuçları sayar; azalan, eşitlikte topicId", () => {
    const marks = [
      { resultId: "r1", topicId: "uslu" },
      { resultId: "r2", topicId: "uslu" },
      { resultId: "r3", topicId: "uslu" },
      { resultId: "r2", topicId: "paragraf" },
      { resultId: "r3", topicId: "basinc" },
      { resultId: "r0", topicId: "paragraf" },
    ];
    expect(topicMarkCounts(marks, new Set(["r1", "r2", "r3"]))).toEqual([
      { topicId: "uslu", count: 3 },
      { topicId: "basinc", count: 1 },
      { topicId: "paragraf", count: 1 },
    ]);
    expect(topicMarkCounts(marks, new Set())).toEqual([]);
  });
});

describe("recentSubjectWrong", () => {
  it("son n denemenin ders yanlışlarını toplar; branş o dersin penceresine girer", () => {
    const points = [
      point("r1", "2026-08-01", 0, { subjects: [subject("mat", 5, 0), subject("tr", 2, 0)] }),
      point("r2", "2026-08-08", 0, { subjects: [subject("mat", 4, 0), subject("tr", 1, 0)] }),
      point("b1", "2026-08-10", 0, { isBranch: true, subjects: [subject("mat", 6, 0)] }),
      point("r3", "2026-08-15", 0, { subjects: [subject("mat", 3, 0), subject("tr", 0, 0)] }),
    ];
    const out = recentSubjectWrong(points, 3);
    expect(out.get("mat")).toEqual({ wrong: 13, exams: 3 }); // r3 + b1 + r2
    expect(out.get("tr")).toEqual({ wrong: 3, exams: 3 }); // r3 + r2 + r1
    expect(recentSubjectWrong(points, 0).size).toBe(0);
  });
});

describe("biçim", () => {
  it("özet cümlede net formatNet ile (virgül, iki basamak)", () => {
    expect(
      trendSummary([point("r1", "2026-08-01", 1), point("r2", "2026-08-02", 2.5)]),
    ).not.toContain(NBSP);
  });
});
