import { describe, expect, it } from "vitest";
import { fitWithin } from "./compress";

describe("fitWithin", () => {
  it("büyük görüntü en uzun kenardan küçülür, oran korunur", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("küçük görüntü büyütülmez; sınırda aynı kalır", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1600, 900, 1600)).toEqual({ width: 1600, height: 900 });
  });

  it("çok dar oranlarda kısa kenar en az 1 px", () => {
    expect(fitWithin(100000, 10, 1600)).toEqual({ width: 1600, height: 1 });
  });
});
