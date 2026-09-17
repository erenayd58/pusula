import { describe, expect, it } from "vitest";
import { streakFrom } from "./streak";

describe("streakFrom", () => {
  it("bugün dahil ardışık günleri sayar", () => {
    expect(streakFrom(["2026-09-17", "2026-09-16", "2026-09-15", "2026-09-13"], "2026-09-17")).toBe(
      3,
    );
  });

  it("bugün kayıt yoksa dünkü seri korunur", () => {
    expect(streakFrom(["2026-09-16", "2026-09-15"], "2026-09-17")).toBe(2);
  });

  it("dün de yoksa 0", () => {
    expect(streakFrom(["2026-09-15", "2026-09-14"], "2026-09-17")).toBe(0);
    expect(streakFrom([], "2026-09-17")).toBe(0);
  });

  it("tekrar eden ve sırasız anahtarlar sorun değil", () => {
    expect(streakFrom(["2026-09-15", "2026-09-17", "2026-09-16", "2026-09-17"], "2026-09-17")).toBe(
      3,
    );
  });

  it("ay sınırını geçer", () => {
    expect(streakFrom(["2026-10-01", "2026-09-30", "2026-09-29"], "2026-10-01")).toBe(3);
  });
});
