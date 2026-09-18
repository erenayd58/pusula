import { describe, expect, it } from "vitest";
import { NBSP } from "@/lib/format";
import { feasibility, feasibilityText } from "./feasibility";

describe("feasibility", () => {
  it("sığıyor: konu + soru dakikası haftalık boş süreden az", () => {
    // 45 konu × 90 dk = 4050 dk / 30 hafta = 135; 6000 soru × 1,5 = 9000 / 39 hafta ≈ 231 → 366 dk.
    const f = feasibility({
      remainingTopicMinutes: 4050,
      weeksToFinish: 30,
      remainingQuestions: 6000,
      minutesPerQuestion: 1.5,
      weeksToExam: 39,
      weeklyAvailableMinutes: 720,
    });
    expect(f).toEqual({ requiredMinutesPerWeek: 366, availableMinutesPerWeek: 720, fits: true });
    expect(feasibilityText(f)).toBe(
      `Bu hedef programa sığıyor: haftada yaklaşık 6${NBSP}sa${NBSP}6${NBSP}dk gerekiyor, 12${NBSP}sa boş var.`,
    );
  });

  it("sığmıyor: gereken süre boş süreyi aşar", () => {
    const f = feasibility({
      remainingTopicMinutes: 4050,
      weeksToFinish: 5,
      remainingQuestions: 6000,
      minutesPerQuestion: 1.5,
      weeksToExam: 10,
      weeklyAvailableMinutes: 720,
    });
    expect(f.requiredMinutesPerWeek).toBe(1710);
    expect(f.fits).toBe(false);
    expect(feasibilityText(f)).toBe(
      `Bu hedef haftada yaklaşık 28${NBSP}sa${NBSP}30${NBSP}dk çalışma gerektiriyor; öğrencinin programında haftada 12${NBSP}sa boş var.`,
    );
  });

  it("hafta tabanı 1; negatif kalanlar 0 sayılır", () => {
    const f = feasibility({
      remainingTopicMinutes: 600,
      weeksToFinish: 0,
      remainingQuestions: -50,
      minutesPerQuestion: 1.5,
      weeksToExam: -3,
      weeklyAvailableMinutes: 600,
    });
    expect(f).toEqual({ requiredMinutesPerWeek: 600, availableMinutesPerWeek: 600, fits: true });
  });
});
