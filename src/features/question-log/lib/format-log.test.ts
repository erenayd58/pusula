import { describe, expect, it } from "vitest";
import { NBSP } from "@/lib/format";
import { formatLogCounts } from "./format-log";

describe("formatLogCounts", () => {
  it("sayı-birim çiftlerini NBSP ile bağlar", () => {
    expect(
      formatLogCounts({ total: 20, correct: 15, wrong: 4, blank: 1, durationMinutes: 35 }),
    ).toBe(`20${NBSP}soru · 15${NBSP}D / 4${NBSP}Y / 1${NBSP}B · 35${NBSP}dk`);
  });
  it("süre yoksa yazmaz", () => {
    expect(formatLogCounts({ total: 10, correct: 8, wrong: 2, blank: 0, durationMinutes: null })).toBe(
      `10${NBSP}soru · 8${NBSP}D / 2${NBSP}Y / 0${NBSP}B`,
    );
  });
});
