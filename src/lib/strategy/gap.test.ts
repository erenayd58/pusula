import { describe, expect, it } from "vitest";
import { combineGap, mockSubjectGap } from "./gap";

describe("mockSubjectGap", () => {
  it("1 − ort. net / soru sayısı", () => {
    expect(mockSubjectGap({ avgNet: 8.3, questionCount: 20 })).toBeCloseTo(0.585);
    expect(mockSubjectGap({ avgNet: 20, questionCount: 20 })).toBe(0);
  });

  it("negatif net 1'e kırpılır, soru sayısı yoksa undefined", () => {
    expect(mockSubjectGap({ avgNet: -2, questionCount: 20 })).toBe(1);
    expect(mockSubjectGap({ avgNet: 5, questionCount: null })).toBeUndefined();
    expect(mockSubjectGap({ avgNet: 5, questionCount: 0 })).toBeUndefined();
  });
});

describe("combineGap", () => {
  it("ikisi varsa ağırlıklı", () => {
    expect(combineGap({ questionGap: 0.4, mockGap: 0.8, weight: 0.5 })).toBeCloseTo(0.6);
    expect(combineGap({ questionGap: 0.4, mockGap: 0.8, weight: 0.25 })).toBeCloseTo(0.5);
  });

  it("biri yoksa diğeri tam ağırlıkla", () => {
    expect(combineGap({ questionGap: 0.4, weight: 0.5 })).toBe(0.4);
    expect(combineGap({ mockGap: 0.8, weight: 0.5 })).toBe(0.8);
    expect(combineGap({ weight: 0.5 })).toBeUndefined();
  });

  it("ağırlık ve sonuç 0–1'e kırpılır", () => {
    expect(combineGap({ questionGap: 0.4, mockGap: 0.8, weight: 2 })).toBe(0.8);
    expect(combineGap({ questionGap: 1.5, weight: 0.5 })).toBe(1);
  });
});
