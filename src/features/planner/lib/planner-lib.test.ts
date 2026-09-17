import { describe, expect, it } from "vitest";
import { NBSP } from "@/lib/format";
import { estimateMinutes, type PlannerDefaults } from "./estimate";
import {
  completionPercent,
  dayMinutes,
  isOverbooked,
  postponedCount,
  weekTotals,
} from "./plan-summary";
import { alertsToPoolItems } from "./alert-pool";
import { buildTaskPool, filterPool } from "./pool";
import { taskMeta, taskTitle } from "./task-title";

const DEFAULTS: PlannerDefaults = {
  minutes_per_question: 1.5,
  topic_study_minutes: 40,
  review_minutes: 20,
  link_minutes: 15,
  custom_minutes: 30,
  questions_target: 20,
};

describe("estimateMinutes", () => {
  it("soru görevinde öğrencinin temposunu kullanır", () => {
    expect(
      estimateMinutes({
        kind: "questions",
        targetValue: 40,
        pace: { minutesPerQuestion: 2.25 },
        defaults: DEFAULTS,
      }),
    ).toBe(90);
  });

  it("tempo yoksa kurum varsayılanı; hedef yoksa varsayılan hedef", () => {
    expect(
      estimateMinutes({ kind: "questions", targetValue: 40, pace: null, defaults: DEFAULTS }),
    ).toBe(60);
    expect(
      estimateMinutes({ kind: "questions", targetValue: null, pace: null, defaults: DEFAULTS }),
    ).toBe(30);
  });

  it("diğer türlerde kurum varsayılanı", () => {
    expect(
      estimateMinutes({ kind: "topic_study", targetValue: null, pace: null, defaults: DEFAULTS }),
    ).toBe(40);
    expect(
      estimateMinutes({ kind: "review", targetValue: null, pace: null, defaults: DEFAULTS }),
    ).toBe(20);
    expect(
      estimateMinutes({ kind: "link", targetValue: null, pace: null, defaults: DEFAULTS }),
    ).toBe(15);
    expect(
      estimateMinutes({ kind: "custom", targetValue: null, pace: null, defaults: DEFAULTS }),
    ).toBe(30);
  });

  it("1–600 aralığına kırpar", () => {
    expect(
      estimateMinutes({
        kind: "questions",
        targetValue: 500,
        pace: { minutesPerQuestion: 5 },
        defaults: DEFAULTS,
      }),
    ).toBe(600);
  });
});

describe("taskTitle / taskMeta", () => {
  it("soru: konu · N soru", () => {
    expect(
      taskTitle({
        kind: "questions",
        subjectName: "Matematik",
        topicName: "Üslü İfadeler",
        targetValue: 40,
        targetUnit: "questions",
      }),
    ).toBe(`Üslü İfadeler · 40${NBSP}soru`);
  });

  it("konusuz soru dersi kullanır; tekrar ve konu çalışması eki alır", () => {
    expect(
      taskTitle({
        kind: "questions",
        subjectName: "Matematik",
        topicName: null,
        targetValue: 20,
        targetUnit: "questions",
      }),
    ).toBe(`Matematik · 20${NBSP}soru`);
    expect(
      taskTitle({
        kind: "review",
        subjectName: "Fen",
        topicName: "Basınç",
        targetValue: null,
        targetUnit: null,
      }),
    ).toBe("Basınç · tekrar");
    expect(
      taskTitle({
        kind: "custom",
        subjectName: null,
        topicName: null,
        targetValue: null,
        targetUnit: null,
      }),
    ).toBe("Serbest");
  });

  it("meta satırı: ders · soru · süre", () => {
    expect(
      taskMeta({
        subjectName: "Matematik",
        targetValue: 40,
        targetUnit: "questions",
        estimatedMinutes: 60,
      }),
    ).toBe(`Matematik · 40${NBSP}soru · 1${NBSP}sa`);
  });
});

describe("plan-summary", () => {
  const items = [
    { dayOfWeek: 1, estimatedMinutes: 30, completedAt: "2026-09-14T10:00:00Z", questions: 20 },
    { dayOfWeek: 1, estimatedMinutes: 40, completedAt: null, questions: null },
    {
      dayOfWeek: null,
      estimatedMinutes: 20,
      completedAt: null,
      postponedAt: "2026-09-15",
      questions: 10,
    },
  ];

  it("uyum = tamamlanan / toplam (bu hafta içinde dahil); boşta null", () => {
    expect(completionPercent(items)).toBe(33);
    expect(completionPercent([])).toBe(null);
  });

  it("gün ve hafta toplamları", () => {
    expect(dayMinutes(items, 1)).toBe(70);
    expect(dayMinutes(items, null)).toBe(20);
    expect(weekTotals(items)).toEqual({ minutes: 90, questions: 30, count: 3 });
    expect(postponedCount(items)).toBe(1);
  });

  it("aşım nötr bir bayraktır", () => {
    expect(isOverbooked(200, 180)).toBe(true);
    expect(isOverbooked(180, 180)).toBe(false);
  });
});

describe("task pool", () => {
  it("kategoriler sabit sırada, boşlar da listede", () => {
    const pool = buildTaskPool({
      frequent: [
        {
          key: "f1",
          categoryId: "frequent",
          kind: "questions",
          title: "Paragraf · 30 soru",
          subjectId: null,
          topicId: null,
          targetValue: 30,
          targetUnit: "questions",
          estimatedMinutes: 45,
        },
      ],
    });
    expect(pool.map((c) => c.id)).toEqual([
      "suggestions",
      "weak",
      "not_started",
      "review_due",
      "frequent",
    ]);
    expect(pool[4]?.items).toHaveLength(1);
    expect(filterPool(pool, "PARAGRAF")[4]?.items).toHaveLength(1);
    expect(filterPool(pool, "olasılık")[4]?.items).toHaveLength(0);
  });
});

describe("alertsToPoolItems", () => {
  const subject = {
    id: "mat",
    name: "Matematik",
    shortName: "Mat",
    color: "subject-math",
    sortOrder: 2,
    examQuestionCount: 20,
  };
  const base = {
    studentId: "s1",
    subject,
    topicSortOrder: 1,
    questions: 0,
    accuracy: null,
    threshold: null,
    idleDays: null,
    delayDays: 0,
  };

  it("uyarı türünü görev türü ve kategoriye eşler; süre ve başlık üretilir", () => {
    const pool = alertsToPoolItems(
      [
        {
          ...base,
          kind: "knowledge_gap",
          topicId: "t1",
          topicName: "Üslü",
          questions: 40,
          accuracy: 50,
        },
        {
          ...base,
          kind: "low_accuracy",
          topicId: "t2",
          topicName: "Kök",
          questions: 20,
          accuracy: 55,
        },
        { ...base, kind: "not_started", topicId: "t3", topicName: "Olasılık" },
        { ...base, kind: "review_due", topicId: "t4", topicName: "Çarpanlar", idleDays: 12 },
        { ...base, kind: "stale", topicId: "t5", topicName: "Veri", idleDays: 50 },
        { ...base, kind: "neglected_subject", topicId: null, topicName: null, idleDays: 12 },
      ],
      { pace: { mat: 2 }, defaults: DEFAULTS, reason: (a) => `sebep:${a.kind}` },
    );
    expect(pool.weak.map((i) => [i.kind, i.title, i.estimatedMinutes])).toEqual([
      ["topic_study", "Üslü · konu çalışması", 40],
      ["questions", `Kök · 20${NBSP}soru`, 40],
    ]);
    expect(pool.weak[1]).toMatchObject({ targetValue: 20, targetUnit: "questions", topicId: "t2" });
    expect(pool.not_started.map((i) => i.kind)).toEqual(["topic_study"]);
    expect(pool.review_due.map((i) => [i.kind, i.reason])).toEqual([
      ["review", "sebep:review_due"],
      ["review", "sebep:stale"],
    ]);
    expect(pool.weak[0]?.reason).toBe("sebep:knowledge_gap");
  });
});
