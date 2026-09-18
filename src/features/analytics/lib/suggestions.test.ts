import { describe, expect, it } from "vitest";
import type { OrgSettings } from "@/features/core";
import { NBSP } from "@/lib/format";
import type { TopicAlertKind } from "@/types";
import type { TopicAlert } from "../types";
import { distributeTasks, type DistributeDay } from "./distribute";
import { DELAY_SATURATION_DAYS, KIND_BASE_SCORE, priorityScore } from "./priority";
import {
  alertToTask,
  buildSuggestions,
  dismissalKey,
  plannedKey,
  type Suggestion,
} from "./suggestions";

const TODAY = "2026-09-18";

/** Kurum varsayılanları (08 §1.2); testte açıkça yazılır, ayar okunmaz. */
const SETTINGS: OrgSettings = {
  schedule: { wake_start: "08:00", wake_end: "22:00" },
  planner: {
    minutes_per_question: 1.5,
    topic_study_minutes: 40,
    review_minutes: 20,
    link_minutes: 15,
    custom_minutes: 30,
    questions_target: 20,
    day_capacity_ratio: 0.7,
    max_items_per_subject_per_day: 2,
  },
  alerts: {
    lookback_days: 60,
    knowledge_gap: { min_questions: 40, max_accuracy: 55 },
    low_accuracy: { min_questions: 20, max_accuracy: 60 },
    review_due_days: [7, 15, 30],
    forgetting_risk: { min_accuracy: 60, idle_days: 21 },
    stale_days: 45,
    neglected_subject_days: 10,
    setup_account_days: 7,
  },
  suggestions: { max_per_student: 5, dismiss_days: 14 },
  strategy: {
    periods: [],
    proximity_days: 120,
    school_lag_weeks: 2,
    topic_minutes_default: 90,
    pace_window_days: 28,
    topics_finish_weeks_before_exam: 8,
  },
};

const MAT = {
  id: "mat",
  name: "Matematik",
  shortName: "Mat",
  color: "subject-math",
  sortOrder: 2,
  examQuestionCount: 20,
};
const DIN = { ...MAT, id: "din", name: "Din Kültürü", shortName: "Din", examQuestionCount: 10 };

function alert(over: Partial<TopicAlert> = {}): TopicAlert {
  return {
    studentId: "s1",
    subject: MAT,
    topicId: "t1",
    topicName: "Üslü İfadeler",
    topicSortOrder: 1,
    kind: "review_due",
    questions: 0,
    accuracy: null,
    threshold: null,
    idleDays: 12,
    delayDays: 5,
    ...over,
  };
}

function build(alerts: TopicAlert[], over: Partial<Parameters<typeof buildSuggestions>[0]> = {}) {
  return buildSuggestions({
    alerts,
    plannedTopicIds: new Set(),
    plannedSubjectIds: new Set(),
    dismissed: new Map(),
    settings: SETTINGS,
    maxExamQuestionCount: 20,
    today: TODAY,
    ...over,
  });
}

describe("priorityScore", () => {
  const base = { examQuestionCount: 20, maxExamQuestionCount: 20, accuracy: null, threshold: null };

  it("ders ağırlığı, zayıflık tabanı ve gecikme 0.4 / 0.3 / 0.3 ile toplanır", () => {
    // ders 1, zayıflık knowledge_gap 1 (ölçek yok), gecikme 0 → 100 × (0.4 + 0.3) = 70
    expect(priorityScore({ ...base, delayDays: 0, kind: "knowledge_gap" })).toBe(70);
    // not_started tabanı 0.4 → 100 × (0.4 + 0.12) = 52
    expect(priorityScore({ ...base, delayDays: 0, kind: "not_started" })).toBe(52);
  });

  it("gecikme 30 günde doyar", () => {
    const at30 = priorityScore({ ...base, delayDays: DELAY_SATURATION_DAYS, kind: "stale" });
    const at90 = priorityScore({ ...base, delayDays: 90, kind: "stale" });
    // 100 × (0.4 + 0.3 × 0.6 + 0.3) = 88
    expect(at30).toBe(88);
    expect(at90).toBe(at30);
    expect(priorityScore({ ...base, delayDays: 15, kind: "stale" })).toBe(73);
  });

  it("ders ağırlığı sınav soru sayısına oranlıdır; en büyük 0 ise 0", () => {
    expect(
      priorityScore({ ...base, examQuestionCount: 10, delayDays: 0, kind: "not_started" }),
    ).toBe(32);
    expect(
      priorityScore({ ...base, maxExamQuestionCount: 0, delayDays: 0, kind: "not_started" }),
    ).toBe(12);
  });

  it("başarı eşiği varsa taban 0.5–1 arasında ölçeklenir", () => {
    // Eşikte (%55 / 55): ölçek 0.5 → zayıflık 0.5 → 100 × (0.4 + 0.15) = 55
    expect(
      priorityScore({ ...base, delayDays: 0, kind: "knowledge_gap", accuracy: 55, threshold: 55 }),
    ).toBe(55);
    // %0 başarı: ölçek 1 → 70
    expect(
      priorityScore({ ...base, delayDays: 0, kind: "knowledge_gap", accuracy: 0, threshold: 55 }),
    ).toBe(70);
    // Eşiğin üstü (başarı 90 / eşik 60): ölçek 0.5 → stale 0.3 → 100 × (0.4 + 0.09) = 49
    expect(
      priorityScore({ ...base, delayDays: 0, kind: "stale", accuracy: 90, threshold: 60 }),
    ).toBe(49);
  });

  it("tür taban puanları belgedeki sırada", () => {
    const order: TopicAlertKind[] = [
      "knowledge_gap",
      "low_accuracy",
      "forgetting_risk",
      "stale",
      "review_due",
      "neglected_subject",
      "not_started",
    ];
    for (let i = 1; i < order.length; i++) {
      expect(KIND_BASE_SCORE[order[i]!]).toBeLessThanOrEqual(KIND_BASE_SCORE[order[i - 1]!]);
    }
  });
});

describe("alertToTask", () => {
  it("bilgi eksiği ve başlanmamış → konu çalışması (kurum süresi)", () => {
    const t = alertToTask(alert({ kind: "knowledge_gap" }), SETTINGS.planner);
    expect(t).toEqual({
      kind: "topic_study",
      targetValue: null,
      targetUnit: null,
      estimatedMinutes: 40,
      title: "Üslü İfadeler · konu çalışması",
    });
    expect(alertToTask(alert({ kind: "not_started" }), SETTINGS.planner).kind).toBe("topic_study");
  });

  it("düşük başarı ve ihmal edilen ders → soru (hedef × soru başına dakika)", () => {
    const t = alertToTask(alert({ kind: "low_accuracy" }), SETTINGS.planner);
    expect(t.kind).toBe("questions");
    expect(t.targetValue).toBe(20);
    expect(t.targetUnit).toBe("questions");
    expect(t.estimatedMinutes).toBe(30);
    expect(t.title).toBe(`Üslü İfadeler · 20${NBSP}soru`);
    const s = alertToTask(
      alert({ kind: "neglected_subject", topicId: null, topicName: null }),
      SETTINGS.planner,
    );
    expect(s.title).toBe(`Matematik · 20${NBSP}soru`);
  });

  it("bakım türleri → tekrar", () => {
    for (const kind of ["review_due", "forgetting_risk", "stale"] as const) {
      const t = alertToTask(alert({ kind }), SETTINGS.planner);
      expect(t.kind).toBe("review");
      expect(t.estimatedMinutes).toBe(20);
      expect(t.title).toBe("Üslü İfadeler · tekrar");
    }
  });
});

describe("buildSuggestions", () => {
  it("uyarıyı puanlı öneriye çevirir; sebep ve görev dolu", () => {
    const [s] = build([alert()]);
    expect(s).toMatchObject({
      studentId: "s1",
      subjectId: "mat",
      topicId: "t1",
      kind: "review_due",
      reason: `12${NBSP}gündür tekrar edilmedi`,
      task: { kind: "review", estimatedMinutes: 20 },
    });
    expect(s?.score).toBeGreaterThan(0);
  });

  it("bu hafta planlı konu önerilmez; ders düzeyi öneri dersin planlı konusuyla elenir", () => {
    const alerts = [
      alert(),
      alert({ topicId: "t2", topicName: "Kareköklü", kind: "not_started" }),
      alert({ kind: "neglected_subject", topicId: null, topicName: null }),
      alert({ subject: DIN, topicId: "d1", topicName: "Kader", kind: "not_started" }),
    ];
    const out = build(alerts, {
      plannedTopicIds: new Set([plannedKey("s1", "t1")]),
      plannedSubjectIds: new Set([plannedKey("s1", "mat")]),
    });
    expect(out.map((s) => s.topicId)).toEqual(["t2", "d1"]);
  });

  it("reddedilen öneri süresi dolana kadar gizlenir (14 gün)", () => {
    const key = dismissalKey("s1", "review_due", "mat", "t1");
    expect(build([alert()], { dismissed: new Map([[key, "2026-10-02"]]) })).toHaveLength(0);
    expect(build([alert()], { dismissed: new Map([[key, TODAY]]) })).toHaveLength(0);
    expect(build([alert()], { dismissed: new Map([[key, "2026-09-17"]]) })).toHaveLength(1);
    // Farklı tür aynı konu: gizlenmez.
    expect(
      build([alert({ kind: "stale" })], { dismissed: new Map([[key, "2026-10-02"]]) }),
    ).toHaveLength(1);
    // Ders düzeyi anahtar konu boş.
    const subjectKey = dismissalKey("s1", "neglected_subject", "mat", null);
    expect(
      build([alert({ kind: "neglected_subject", topicId: null, topicName: null })], {
        dismissed: new Map([[subjectKey, "2026-10-02"]]),
      }),
    ).toHaveLength(0);
  });

  it("puana göre sıralar; eşit puanda uyarı sırası korunur", () => {
    const out = build([
      alert({ topicId: "a", kind: "not_started", delayDays: 0 }),
      alert({ topicId: "b", kind: "knowledge_gap", questions: 40, accuracy: 30, threshold: 55 }),
      alert({ topicId: "c", kind: "not_started", delayDays: 0 }),
    ]);
    expect(out.map((s) => s.topicId)).toEqual(["b", "a", "c"]);
    expect(out[0]!.score).toBeGreaterThan(out[1]!.score);
  });

  it("öğrenci başına en fazla max_per_student; başka öğrenci etkilenmez", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      alert({ topicId: `t${i}`, kind: "not_started", delayDays: i }),
    );
    const other = alert({ studentId: "s2", topicId: "x" });
    const out = build([...many, other]);
    expect(out.filter((s) => s.studentId === "s1")).toHaveLength(5);
    expect(out.filter((s) => s.studentId === "s2")).toHaveLength(1);
    // En yüksek puanlılar kaldı (gecikmesi büyük olanlar).
    expect(out.filter((s) => s.studentId === "s1").map((s) => s.topicId)).toEqual([
      "t6",
      "t5",
      "t4",
      "t3",
      "t2",
    ]);
  });
});

describe("distributeTasks", () => {
  const days: DistributeDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
    dayOfWeek,
    availableMinutes: 100,
  }));

  function suggestion(over: Partial<Suggestion> & { minutes?: number } = {}): Suggestion {
    const { minutes = 40, ...rest } = over;
    return {
      studentId: "s1",
      subjectId: "mat",
      subjectName: "Matematik",
      subjectShortName: "Mat",
      subjectColor: "subject-math",
      topicId: "t1",
      topicName: "Konu",
      kind: "not_started",
      reason: "Sıradaki konu",
      task: {
        kind: "topic_study",
        targetValue: null,
        targetUnit: null,
        estimatedMinutes: minutes,
        title: "Konu · konu çalışması",
      },
      score: 50,
      ...rest,
    };
  }

  it("kapasitesi en yüksek güne, eşitlikte erken güne; sonra dağılır", () => {
    const out = distributeTasks({
      suggestions: [
        suggestion({ topicId: "a", subjectId: "mat" }),
        suggestion({ topicId: "b", subjectId: "fen" }),
        suggestion({ topicId: "c", subjectId: "tur" }),
      ],
      days,
      existing: [],
      ratio: 0.7,
      maxPerSubjectPerDay: 2,
    });
    // Kapasite 70: ilk görev pazartesi (kalan 30), ikinci salı, üçüncü çarşamba.
    expect(out.map((p) => p.dayOfWeek)).toEqual([1, 2, 3]);
  });

  it("gün başına kapasite = müsait × ratio − planlanan; sığmayan 'bu hafta içinde'", () => {
    const out = distributeTasks({
      suggestions: [
        suggestion({ topicId: "a", minutes: 60 }),
        suggestion({ topicId: "b", minutes: 60 }),
      ],
      days: [
        { dayOfWeek: 1, availableMinutes: 100 },
        { dayOfWeek: 2, availableMinutes: 100 },
      ],
      existing: [{ dayOfWeek: 1, subjectId: "fen", minutes: 30 }],
      ratio: 0.7,
      maxPerSubjectPerDay: 2,
    });
    // Pzt kapasite 70 − 30 = 40 < 60; Sal 70 → a Salı; b hiçbir güne sığmaz.
    expect(out.map((p) => p.dayOfWeek)).toEqual([2, null]);
  });

  it("ders başına gün sınırı (mevcut görevler dahil)", () => {
    const out = distributeTasks({
      suggestions: [
        suggestion({ topicId: "a", minutes: 10 }),
        suggestion({ topicId: "b", minutes: 10 }),
        suggestion({ topicId: "c", minutes: 10 }),
      ],
      days: [
        { dayOfWeek: 1, availableMinutes: 1000 },
        { dayOfWeek: 2, availableMinutes: 100 },
      ],
      existing: [{ dayOfWeek: 1, subjectId: "mat", minutes: 10 }],
      ratio: 1,
      maxPerSubjectPerDay: 2,
    });
    // Pzt'de Matematik zaten 1: a Pzt (sınır doldu); b ve c Salı (Salı'da 2, sınırda).
    expect(out.map((p) => p.dayOfWeek)).toEqual([1, 2, 2]);
    const more = distributeTasks({
      suggestions: [suggestion({ topicId: "d", minutes: 10 })],
      days: [{ dayOfWeek: 1, availableMinutes: 1000 }],
      existing: [
        { dayOfWeek: 1, subjectId: "mat", minutes: 10 },
        { dayOfWeek: 1, subjectId: "mat", minutes: 10 },
      ],
      ratio: 1,
      maxPerSubjectPerDay: 2,
    });
    expect(more[0]!.dayOfWeek).toBeNull();
  });

  it("puana göre sırayla yerleştirir; gün dizisi boşsa hepsi 'bu hafta içinde'", () => {
    const out = distributeTasks({
      suggestions: [
        suggestion({ topicId: "low", score: 10 }),
        suggestion({ topicId: "high", score: 90 }),
      ],
      days: [{ dayOfWeek: 5, availableMinutes: 50 }],
      existing: [],
      ratio: 1,
      maxPerSubjectPerDay: 2,
    });
    expect(out[0]).toMatchObject({ dayOfWeek: 5, suggestion: { topicId: "high" } });
    expect(out[1]).toMatchObject({ dayOfWeek: null, suggestion: { topicId: "low" } });
    expect(
      distributeTasks({
        suggestions: [suggestion()],
        days: [],
        existing: [],
        ratio: 0.7,
        maxPerSubjectPerDay: 2,
      }),
    ).toEqual([{ dayOfWeek: null, suggestion: suggestion() }]);
  });
});
