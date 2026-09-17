import { describe, expect, it } from "vitest";
import { completionPercent, countDone } from "./completion";

describe("completionPercent", () => {
  it("konu yoksa 0", () => {
    expect(completionPercent([])).toBe(0);
  });

  it("sadece tamamlandı ve oturdu sayılır", () => {
    expect(
      completionPercent(["completed", "mastered", "studying", "needs_review", "not_started"]),
    ).toBe(40);
  });

  it("tam sayıya yuvarlar", () => {
    expect(completionPercent(["completed", "not_started", "not_started"])).toBe(33);
    expect(completionPercent(["completed", "completed", "not_started"])).toBe(67);
  });

  it("hepsi bitmişse 100", () => {
    expect(completionPercent(["mastered", "completed"])).toBe(100);
  });
});

describe("countDone", () => {
  it("tamamlandı + oturdu sayısı", () => {
    expect(countDone(["completed", "mastered", "studying"])).toBe(2);
  });
});
