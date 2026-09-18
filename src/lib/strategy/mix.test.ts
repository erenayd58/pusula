import { describe, expect, it } from "vitest";
import { allocateByMix, mixCategoryOf } from "./mix";

describe("mixCategoryOf", () => {
  it("türleri üç kategoriye ayırır", () => {
    expect(mixCategoryOf("not_started")).toBe("new_topic");
    expect(mixCategoryOf("behind_school")).toBe("new_topic");
    expect(mixCategoryOf("knowledge_gap")).toBe("weak");
    expect(mixCategoryOf("low_accuracy")).toBe("weak");
    expect(mixCategoryOf("neglected_subject")).toBe("weak");
    expect(mixCategoryOf("review_due")).toBe("review");
    expect(mixCategoryOf("forgetting_risk")).toBe("review");
    expect(mixCategoryOf("stale")).toBe("review");
  });
});

describe("allocateByMix", () => {
  it("yüzdelere göre paylaştırır, toplam max", () => {
    expect(allocateByMix(5, { new_topic: 50, weak: 30, review: 20 })).toEqual({
      new_topic: 3,
      weak: 1,
      review: 1,
    });
    expect(allocateByMix(10, { new_topic: 50, weak: 30, review: 20 })).toEqual({
      new_topic: 5,
      weak: 3,
      review: 2,
    });
  });

  it("en büyük kalan: 5 × 20/40/40 → 1/2/2; 5 × 0/50/50 → 0/3/2 (eşitlikte sıra)", () => {
    expect(allocateByMix(5, { new_topic: 20, weak: 40, review: 40 })).toEqual({
      new_topic: 1,
      weak: 2,
      review: 2,
    });
    expect(allocateByMix(5, { new_topic: 0, weak: 50, review: 50 })).toEqual({
      new_topic: 0,
      weak: 3,
      review: 2,
    });
  });

  it("yüzde toplamı 100 değilse normalize eder; toplam 0 ya da max 0 ise hepsi 0", () => {
    expect(allocateByMix(4, { new_topic: 1, weak: 1, review: 0 })).toEqual({
      new_topic: 2,
      weak: 2,
      review: 0,
    });
    expect(allocateByMix(5, { new_topic: 0, weak: 0, review: 0 })).toEqual({
      new_topic: 0,
      weak: 0,
      review: 0,
    });
    expect(allocateByMix(0, { new_topic: 50, weak: 30, review: 20 })).toEqual({
      new_topic: 0,
      weak: 0,
      review: 0,
    });
  });
});
