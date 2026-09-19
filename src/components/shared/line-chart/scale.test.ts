import { describe, expect, it } from "vitest";
import { linePath, niceCeil, yTicks } from "./scale";

describe("niceCeil", () => {
  it("güzel üst sınır", () => {
    expect(niceCeil(71.33)).toBe(80);
    expect(niceCeil(18)).toBe(20);
    expect(niceCeil(0)).toBe(10);
    expect(niceCeil(80)).toBe(80);
    expect(niceCeil(150)).toBe(150);
    expect(niceCeil(5)).toBe(5);
    expect(niceCeil(0.5)).toBe(0.5);
    expect(niceCeil(-3)).toBe(10);
    expect(niceCeil(Number.NaN)).toBe(10);
  });
});

describe("yTicks", () => {
  it("0'dan üst sınıra eşit aralıklar", () => {
    expect(yTicks(71.33)).toEqual([0, 20, 40, 60, 80]);
    expect(yTicks(18, 2)).toEqual([0, 10, 20]);
    expect(yTicks(0)).toEqual([0, 2.5, 5, 7.5, 10]);
  });
});

describe("linePath", () => {
  it("noktaları L ile bağlar", () => {
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 50, y: 20.555 },
        { x: 100, y: 5 },
      ]),
    ).toBe("M0 10 L50 20.56 L100 5");
  });
  it("null noktada çizgi kesilir, sonrakinde yeniden başlar", () => {
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 50, y: null },
        { x: 100, y: 5 },
        { x: 150, y: 8 },
      ]),
    ).toBe("M0 10 M100 5 L150 8");
    expect(linePath([{ x: 0, y: null }])).toBe("");
    expect(linePath([])).toBe("");
  });
});
