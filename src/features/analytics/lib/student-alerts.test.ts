import { describe, expect, it } from "vitest";
import { NBSP } from "@/lib/format";
import type { StudentAlertFacts } from "../types";
import {
  evaluateStudentAlerts,
  studentAlertAction,
  studentAlertReason,
  type StudentAlertThresholds,
} from "./student-alerts";

const MINUS = String.fromCharCode(0x2212);
const t: StudentAlertThresholds = {
  inactivity_days: 3,
  goal_behind: { from_isodow: 3, min_percent: 40 },
  net_drop: 5,
  low_plan_percent: 50,
  overdue_reviews_max: 15,
  inactivity_notify_days: 7,
};
// 2026-09-17 perşembe (isodow 4), 2026-09-14 pazartesi (isodow 1)
const THU = "2026-09-17";
const MON = "2026-09-14";

function f(over: Partial<StudentAlertFacts> = {}): StudentAlertFacts {
  return {
    studentId: "s1",
    status: "active",
    lastLogDate: THU,
    weeklyTarget: 300,
    weekGoalPercent: 80,
    netDelta: 2,
    planPercentLastWeek: 90,
    overdueReviews: 0,
    ...over,
  };
}

describe("evaluateStudentAlerts", () => {
  it("sorunsuz öğrencide uyarı yok", () => {
    expect(evaluateStudentAlerts([f()], t, THU)).toEqual([]);
  });

  it("hareketsizlik: son kayıt eşik kadar eski; hiç kayıt yoksa üretilmez", () => {
    expect(evaluateStudentAlerts([f({ lastLogDate: "2026-09-14" })], t, THU)).toEqual([
      { studentId: "s1", kind: "inactive", value: 3 },
    ]);
    expect(evaluateStudentAlerts([f({ lastLogDate: "2026-09-15" })], t, THU)).toEqual([]);
    expect(evaluateStudentAlerts([f({ lastLogDate: null })], t, THU)).toEqual([]);
  });

  it("net düşüşü: delta ≤ −eşik; tek deneme (null) üretmez", () => {
    expect(evaluateStudentAlerts([f({ netDelta: -5 })], t, THU)).toEqual([
      { studentId: "s1", kind: "net_drop", value: -5 },
    ]);
    expect(evaluateStudentAlerts([f({ netDelta: -4.99 })], t, THU)).toEqual([]);
    expect(evaluateStudentAlerts([f({ netDelta: null })], t, THU)).toEqual([]);
  });

  it("plan uyumu düşük: geçen hafta yayınlanmış plan varsa", () => {
    expect(evaluateStudentAlerts([f({ planPercentLastWeek: 33 })], t, THU)).toEqual([
      { studentId: "s1", kind: "low_plan", value: 33 },
    ]);
    expect(evaluateStudentAlerts([f({ planPercentLastWeek: 50 })], t, THU)).toEqual([]);
    expect(evaluateStudentAlerts([f({ planPercentLastWeek: null })], t, THU)).toEqual([]);
  });

  it("hedef geride: haftanın ortasından itibaren, hedef varsa", () => {
    expect(evaluateStudentAlerts([f({ weekGoalPercent: 25 })], t, THU)).toEqual([
      { studentId: "s1", kind: "goal_behind", value: 25 },
    ]);
    expect(evaluateStudentAlerts([f({ weekGoalPercent: 25 })], t, MON)).toEqual([]);
    expect(evaluateStudentAlerts([f({ weekGoalPercent: 40 })], t, THU)).toEqual([]);
    expect(
      evaluateStudentAlerts([f({ weeklyTarget: null, weekGoalPercent: null })], t, THU),
    ).toEqual([]);
  });

  it("birikmiş tekrar: eşiği aşınca", () => {
    expect(evaluateStudentAlerts([f({ overdueReviews: 16 })], t, THU)).toEqual([
      { studentId: "s1", kind: "overdue_reviews", value: 16 },
    ]);
    expect(evaluateStudentAlerts([f({ overdueReviews: 15 })], t, THU)).toEqual([]);
  });

  it("birden fazla uyarı sabit sırada; pasif öğrenci dışarıda; eşikler parametre", () => {
    const facts = [
      f({ overdueReviews: 20, netDelta: -8, lastLogDate: "2026-09-10", planPercentLastWeek: 10 }),
      f({ studentId: "s2", status: "paused", netDelta: -8 }),
    ];
    expect(evaluateStudentAlerts(facts, t, THU).map((a) => a.kind)).toEqual([
      "inactive",
      "net_drop",
      "low_plan",
      "overdue_reviews",
    ]);
    const loose = {
      ...t,
      inactivity_days: 10,
      net_drop: 10,
      low_plan_percent: 5,
      overdue_reviews_max: 30,
    };
    expect(evaluateStudentAlerts(facts, loose, THU)).toEqual([]);
  });
});

describe("studentAlertReason / studentAlertAction", () => {
  it("sebep metinleri nötr ve biçimli", () => {
    expect(studentAlertReason({ studentId: "s", kind: "inactive", value: 5 })).toBe(
      `5${NBSP}gündür kayıt yok`,
    );
    expect(studentAlertReason({ studentId: "s", kind: "net_drop", value: -6.33 })).toBe(
      `Son denemede ${MINUS}6,33 net`,
    );
    expect(studentAlertReason({ studentId: "s", kind: "low_plan", value: 33 })).toBe(
      "Geçen hafta planın %33'ü tamamlandı",
    );
    expect(studentAlertReason({ studentId: "s", kind: "goal_behind", value: 25 })).toBe(
      "Haftalık hedefin %25'i tamamlandı",
    );
    expect(studentAlertReason({ studentId: "s", kind: "overdue_reviews", value: 18 })).toBe(
      `18${NBSP}tekrar birikti`,
    );
  });

  it("hızlı eylemler türe göre", () => {
    expect(studentAlertAction({ studentId: "s", kind: "inactive", value: 5 })).toEqual({
      label: "Not yaz",
      href: "/coach/students/s/notes?new=1",
    });
    expect(studentAlertAction({ studentId: "s", kind: "net_drop", value: -6 }).label).toBe(
      "Planı gözden geçir",
    );
    expect(studentAlertAction({ studentId: "s", kind: "overdue_reviews", value: 20 })).toEqual({
      label: "Tekrar planı kur",
      href: "/coach/students/s/plan",
    });
    expect(studentAlertAction({ studentId: "s", kind: "goal_behind", value: 20 }).href).toBe(
      "/coach/students/s#goals",
    );
  });
});
