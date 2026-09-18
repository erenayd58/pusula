import { describe, expect, it } from "vitest";
import { orgSettingsFormSchema } from "../schemas";
import { parseOrgSettings } from "./org-settings";

describe("parseOrgSettings", () => {
  it("boş JSON'da tüm varsayılanları üretir", () => {
    const s = parseOrgSettings({});
    expect(s.schedule).toEqual({ wake_start: "08:00", wake_end: "22:00" });
    expect(s.planner.minutes_per_question).toBe(1.5);
    expect(s.alerts.knowledge_gap).toEqual({ min_questions: 40, max_accuracy: 55 });
    expect(s.alerts.review_due_days).toEqual([7, 15, 30]);
    expect(s.suggestions.dismiss_days).toBe(14);
    expect(s.strategy).toEqual({
      periods: [],
      proximity_days: 120,
      school_lag_weeks: 2,
      topic_minutes_default: 90,
      pace_window_days: 28,
      topics_finish_weeks_before_exam: 8,
    });
  });

  it("sezon dönemleri veritabanından okunur", () => {
    const period = {
      name: "Yeni konu öğrenme",
      starts_on: "2026-09-14",
      ends_on: "2027-03-20",
      mix: { new_topic: 50, weak: 30, review: 20 },
    };
    const s = parseOrgSettings({ strategy: { periods: [period] } });
    expect(s.strategy.periods).toEqual([period]);
    expect(s.strategy.school_lag_weeks).toBe(2);
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

describe("orgSettingsFormSchema.strategy", () => {
  const base = parseOrgSettings({});
  const period = (over: Partial<{ name: string; starts_on: string; ends_on: string }>) => ({
    name: "Dönem",
    starts_on: "2026-09-14",
    ends_on: "2027-03-20",
    mix: { new_topic: 50, weak: 30, review: 20 },
    ...over,
  });
  const withPeriods = (periods: ReturnType<typeof period>[]) =>
    orgSettingsFormSchema.safeParse({ ...base, strategy: { ...base.strategy, periods } });

  it("çakışmayan dönemler (boşluk serbest) geçer", () => {
    const r = withPeriods([
      period({ name: "A" }),
      period({ name: "B", starts_on: "2027-03-21", ends_on: "2027-05-08" }),
      period({ name: "C", starts_on: "2027-05-15", ends_on: "2027-06-13" }),
    ]);
    expect(r.success).toBe(true);
  });

  it("çakışan aralık form hatası (sonraki satırın başlangıcında)", () => {
    const r = withPeriods([
      period({ name: "A" }),
      period({ name: "B", starts_on: "2027-03-20", ends_on: "2027-05-08" }),
    ]);
    expect(r.success).toBe(false);
    const issue = r.error?.issues.find((i) => i.path.join(".") === "strategy.periods.1.starts_on");
    expect(issue?.message).toBe("“A” dönemiyle çakışıyor.");
  });

  it("bitiş başlangıçtan önce olamaz; karışım toplamı 100 olmalı; en fazla 6 satır", () => {
    const rev = withPeriods([period({ starts_on: "2027-03-20", ends_on: "2026-09-14" })]);
    expect(rev.error?.issues.map((i) => i.path.join("."))).toContain("strategy.periods.0.ends_on");

    const mix = orgSettingsFormSchema.safeParse({
      ...base,
      strategy: {
        ...base.strategy,
        periods: [{ ...period({}), mix: { new_topic: 50, weak: 30, review: 30 } }],
      },
    });
    expect(mix.error?.issues.map((i) => i.path.join("."))).toContain(
      "strategy.periods.0.mix.review",
    );

    const many = withPeriods(
      Array.from({ length: 7 }, (_, i) =>
        period({ name: `D${i}`, starts_on: `2026-${10 + (i % 3)}-0${i + 1}`, ends_on: `2026-${10 + (i % 3)}-0${i + 1}` }),
      ),
    );
    expect(many.error?.issues.some((i) => i.message === "En fazla 6 dönem tanımlanabilir.")).toBe(
      true,
    );
  });
});
