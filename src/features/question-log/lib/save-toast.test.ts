import { describe, expect, it } from "vitest";
import { NBSP } from "@/lib/format";
import { saveToastMessage } from "./save-toast";

describe("saveToastMessage", () => {
  it("hedef yoksa yalnızca Kaydedildi", () => {
    expect(saveToastMessage({ todayTotal: 20, dailyTarget: null })).toBe("Kaydedildi.");
  });
  it("kalan soruyu yazar", () => {
    expect(saveToastMessage({ todayTotal: 86, dailyTarget: 120 })).toBe(
      `Kaydedildi. Bugün 34${NBSP}soru kaldı.`,
    );
  });
  it("hedefe ulaşınca hedef tamam", () => {
    expect(saveToastMessage({ todayTotal: 120, dailyTarget: 120 })).toBe(
      "Kaydedildi. Günlük hedef tamam!",
    );
    expect(saveToastMessage({ todayTotal: 130, dailyTarget: 120 })).toBe(
      "Kaydedildi. Günlük hedef tamam!",
    );
  });
});
