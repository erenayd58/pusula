import { describe, expect, it } from "vitest";
import { accuracyPercent, calculateNet, wrongPenaltyOf } from "./net";

describe("calculateNet", () => {
  it("3 yanlış bir doğruyu götürür", () => {
    expect(calculateNet({ correct: 32, wrong: 6, wrongPenalty: 3 })).toBe(30);
    expect(calculateNet({ correct: 15, wrong: 4, wrongPenalty: 3 })).toBeCloseTo(13.6667, 3);
  });

  it("ceza yoksa net = doğru", () => {
    expect(calculateNet({ correct: 10, wrong: 5, wrongPenalty: 0 })).toBe(10);
    expect(calculateNet({ correct: 10, wrong: 5, wrongPenalty: null })).toBe(10);
  });

  it("negatif net mümkündür", () => {
    expect(calculateNet({ correct: 0, wrong: 3, wrongPenalty: 3 })).toBe(-1);
  });
});

describe("wrongPenaltyOf", () => {
  it("şablon scoring JSON'undan okur", () => {
    expect(wrongPenaltyOf({ wrong_penalty: 3, sections: [] })).toBe(3);
    expect(wrongPenaltyOf({ wrong_penalty: 4 })).toBe(4);
  });
  it("eksik veya geçersizse 0", () => {
    expect(wrongPenaltyOf(null)).toBe(0);
    expect(wrongPenaltyOf({})).toBe(0);
    expect(wrongPenaltyOf({ wrong_penalty: "3" })).toBe(0);
    expect(wrongPenaltyOf({ wrong_penalty: -1 })).toBe(0);
  });
});

describe("accuracyPercent", () => {
  it("yuvarlar, soru yoksa null", () => {
    expect(accuracyPercent(111, 142)).toBe(78);
    expect(accuracyPercent(0, 0)).toBeNull();
    expect(accuracyPercent(5, 5)).toBe(100);
  });
});
