import { describe, expect, it } from "vitest";
import { dominantReasonSentence, reasonDistribution } from "./mistakes";

describe("reasonDistribution", () => {
  it("boş → []", () => {
    expect(reasonDistribution([])).toEqual([]);
  });

  it("sayıya göre azalan, yüzdeler toplam 100 (en büyük kalan)", () => {
    const rows = [
      ...Array<{ reason: "knowledge_gap" }>(8).fill({ reason: "knowledge_gap" }),
      ...Array<{ reason: "attention" }>(7).fill({ reason: "attention" }),
      ...Array<{ reason: "time" }>(6).fill({ reason: "time" }),
    ];
    // 8/21 = 38,09 · 7/21 = 33,33 · 6/21 = 28,57 → 38 + 33 + 28 = 99 → kalan 1 en büyük kesre (28,57).
    expect(reasonDistribution(rows)).toEqual([
      { reason: "knowledge_gap", count: 8, percent: 38 },
      { reason: "attention", count: 7, percent: 33 },
      { reason: "time", count: 6, percent: 29 },
    ]);
  });

  it("eşitlikte ilk görülen önce; tek neden %100", () => {
    expect(reasonDistribution([{ reason: "time" }, { reason: "unknown" }])).toEqual([
      { reason: "time", count: 1, percent: 50 },
      { reason: "unknown", count: 1, percent: 50 },
    ]);
    expect(reasonDistribution([{ reason: "calculation" }])).toEqual([
      { reason: "calculation", count: 1, percent: 100 },
    ]);
  });
});

describe("dominantReasonSentence", () => {
  it("en büyük dilimden cümle", () => {
    expect(
      dominantReasonSentence([
        { reason: "knowledge_gap", count: 8, percent: 38 },
        { reason: "attention", count: 7, percent: 33 },
      ]),
    ).toBe("Yanlışların %38'i bilgi eksiği");
  });

  it("boş ya da baskın unknown → null", () => {
    expect(dominantReasonSentence([])).toBeNull();
    expect(dominantReasonSentence([{ reason: "unknown", count: 3, percent: 60 }])).toBeNull();
  });
});
