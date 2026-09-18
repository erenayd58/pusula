import { describe, expect, it } from "vitest";
import { parseOrgSettings } from "./org-settings";

describe("parseOrgSettings", () => {
  it("boş JSON'da tüm varsayılanları üretir", () => {
    const s = parseOrgSettings({});
    expect(s.schedule).toEqual({ wake_start: "08:00", wake_end: "22:00" });
    expect(s.planner.minutes_per_question).toBe(1.5);
    expect(s.alerts.knowledge_gap).toEqual({ min_questions: 40, max_accuracy: 55 });
    expect(s.alerts.review_due_days).toEqual([7, 15, 30]);
    expect(s.suggestions.dismiss_days).toBe(14);
  });

  it("veritabanındaki değer varsayılanı ezer, eksik anahtar tamamlanır", () => {
    const s = parseOrgSettings({ schedule: { wake_start: "09:00" }, alerts: { stale_days: 60 } });
    expect(s.schedule).toEqual({ wake_start: "09:00", wake_end: "22:00" });
    expect(s.alerts.stale_days).toBe(60);
    expect(s.alerts.lookback_days).toBe(60);
  });

  it("bozuk JSON'da varsayılanlara düşer", () => {
    expect(parseOrgSettings({ schedule: { wake_start: "25:99" } }).schedule.wake_start).toBe(
      "08:00",
    );
    expect(parseOrgSettings(null).planner.questions_target).toBe(20);
  });
});
