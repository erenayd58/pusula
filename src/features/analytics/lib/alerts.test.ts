import { describe, expect, it } from "vitest";
import { NBSP } from "@/lib/format";
import type { TopicAlertFacts } from "../types";
import { alertReason, evaluateTopicAlerts, groupAlerts, type AlertThresholds } from "./alerts";
import { nudgeText, pickStudentNudge } from "./nudge";

const TODAY = "2026-09-18";
/** Kurum varsayılanları (08 §1.2); testte açıkça yazılır, ayar okunmaz. */
const t: AlertThresholds = {
  lookback_days: 60,
  knowledge_gap: { min_questions: 40, max_accuracy: 55 },
  low_accuracy: { min_questions: 20, max_accuracy: 60 },
  review_due_days: [7, 15, 30],
  forgetting_risk: { min_accuracy: 60, idle_days: 21 },
  stale_days: 45,
  neglected_subject_days: 10,
};

/** Bugünden n gün önce (İstanbul öğle saati; gün hesapları takvim günüdür). */
const ago = (n: number) => {
  const d = new Date(`${TODAY}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
};
const dateAgo = (n: number) => ago(n).slice(0, 10);

function fact(over: Partial<TopicAlertFacts> = {}): TopicAlertFacts {
  return {
    studentId: "s1",
    organizationId: "o1",
    coachId: "c1",
    subjectId: "mat",
    subjectName: "Matematik",
    subjectShortName: "Mat",
    subjectColor: "subject-math",
    subjectSortOrder: 2,
    examQuestionCount: 20,
    topicId: "t1",
    topicName: "Üslü İfadeler",
    topicSortOrder: 1,
    status: "not_started",
    statusChangedAt: null,
    completedAt: null,
    lastReviewedAt: null,
    questionsWindow: 0,
    correctWindow: 0,
    lastTopicLogDate: dateAgo(1),
    subjectLastLogDate: dateAgo(1),
    studentFirstLogDate: dateAgo(30),
    isNextTopic: false,
    ...over,
  };
}

describe("evaluateTopicAlerts", () => {
  it("knowledge_gap: 40+ soruda %55 altı", () => {
    const [a] = evaluateTopicAlerts([fact({ questionsWindow: 40, correctWindow: 21 })], t, TODAY);
    expect(a?.kind).toBe("knowledge_gap");
    expect(a?.accuracy).toBe(53);
    expect(a?.threshold).toBe(55);
    expect(alertReason(a!)).toBe(`40${NBSP}soruda %53 başarı`);
  });

  it("low_accuracy: 20+ soruda %60 altı; knowledge_gap eşiği tutmuyorsa", () => {
    const [a] = evaluateTopicAlerts([fact({ questionsWindow: 25, correctWindow: 14 })], t, TODAY);
    expect(a?.kind).toBe("low_accuracy");
    expect(a?.accuracy).toBe(56);
  });

  it("boş yanlış sayılır: doğru / toplam", () => {
    const [a] = evaluateTopicAlerts([fact({ questionsWindow: 40, correctWindow: 30 })], t, TODAY);
    expect(a).toBeUndefined();
  });

  it("stale: çalışılıyor/tekrar gerekli durumu 45+ gündür değişmemiş", () => {
    const [a] = evaluateTopicAlerts(
      [fact({ status: "studying", statusChangedAt: ago(50) })],
      t,
      TODAY,
    );
    expect(a?.kind).toBe("stale");
    expect(a?.idleDays).toBe(50);
    expect(a?.delayDays).toBe(5);
    expect(alertReason(a!)).toBe(`50${NBSP}gündür ilerleme yok`);
    expect(
      evaluateTopicAlerts([fact({ status: "studying", statusChangedAt: ago(10) })], t, TODAY),
    ).toEqual([]);
  });

  it("forgetting_risk: tamamlanmış, başarı iyi (ya da soru yok), 21+ gündür etkinlik yok", () => {
    const [a] = evaluateTopicAlerts(
      [
        fact({
          status: "mastered",
          completedAt: ago(40),
          lastReviewedAt: ago(25),
          lastTopicLogDate: dateAgo(30),
        }),
      ],
      t,
      TODAY,
    );
    expect(a?.kind).toBe("forgetting_risk");
    expect(a?.idleDays).toBe(25);
    expect(a?.delayDays).toBe(4);
    expect(alertReason(a!)).toBe(`25${NBSP}gündür bakılmadı`);
  });

  it("forgetting_risk: başarı düşükse tetiklenmez (önce başarı kuralları)", () => {
    const [a] = evaluateTopicAlerts(
      [
        fact({
          status: "completed",
          completedAt: ago(40),
          lastTopicLogDate: dateAgo(30),
          questionsWindow: 20,
          correctWindow: 10,
        }),
      ],
      t,
      TODAY,
    );
    expect(a?.kind).toBe("low_accuracy");
  });

  it("review_due: geçilen en büyük eşikten sonra konuda kayıt/tekrar yok", () => {
    // Tamamlanalı 20 gün → eşik 15; 5 gün önceki gün eşiği. Son kayıt 10 gün önce → eşikten önce.
    const [a] = evaluateTopicAlerts(
      [fact({ status: "completed", completedAt: ago(20), lastTopicLogDate: dateAgo(10) })],
      t,
      TODAY,
    );
    expect(a?.kind).toBe("review_due");
    expect(a?.delayDays).toBe(5);
    expect(a?.idleDays).toBe(10);
    expect(alertReason(a!)).toBe(`10${NBSP}gündür tekrar edilmedi`);
    // Eşik gününden sonra kayıt varsa uyarı yok.
    expect(
      evaluateTopicAlerts(
        [fact({ status: "completed", completedAt: ago(20), lastTopicLogDate: dateAgo(3) })],
        t,
        TODAY,
      ),
    ).toEqual([]);
    // Henüz ilk eşik (7 gün) geçilmemişse uyarı yok.
    expect(
      evaluateTopicAlerts(
        [fact({ status: "completed", completedAt: ago(5), lastTopicLogDate: null })],
        t,
        TODAY,
      ),
    ).toEqual([]);
  });

  it("not_started: yalnızca dersin sıradaki konusu", () => {
    const alerts = evaluateTopicAlerts(
      [
        fact({ isNextTopic: true }),
        fact({ topicId: "t2", topicName: "Kareköklü", topicSortOrder: 2, isNextTopic: false }),
      ],
      t,
      TODAY,
    );
    expect(alerts.map((a) => [a.kind, a.topicId])).toEqual([["not_started", "t1"]]);
    expect(alertReason(alerts[0]!)).toBe("Sıradaki konu");
  });

  it("konu başına en fazla bir uyarı; öncelik başarı kuralında", () => {
    const alerts = evaluateTopicAlerts(
      [
        fact({
          status: "studying",
          statusChangedAt: ago(60),
          questionsWindow: 40,
          correctWindow: 10,
          isNextTopic: true,
        }),
      ],
      t,
      TODAY,
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.kind).toBe("knowledge_gap");
  });

  it("neglected_subject: derste 10+ gündür kayıt yok (ders başına bir kez)", () => {
    const alerts = evaluateTopicAlerts(
      [
        fact({ subjectLastLogDate: dateAgo(12), lastTopicLogDate: null }),
        fact({
          topicId: "t2",
          topicSortOrder: 2,
          subjectLastLogDate: dateAgo(12),
          lastTopicLogDate: null,
        }),
      ],
      t,
      TODAY,
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      kind: "neglected_subject",
      topicId: null,
      idleDays: 12,
      delayDays: 2,
    });
    expect(alertReason(alerts[0]!)).toBe(`12${NBSP}gündür bu derste kayıt yok`);
  });

  it("neglected_subject: derste hiç kayıt yoksa öğrencinin ilk kaydından sayılır", () => {
    expect(
      evaluateTopicAlerts(
        [
          fact({
            subjectLastLogDate: null,
            lastTopicLogDate: null,
            studentFirstLogDate: dateAgo(11),
          }),
        ],
        t,
        TODAY,
      ).map((a) => a.kind),
    ).toEqual(["neglected_subject"]);
    expect(
      evaluateTopicAlerts(
        [
          fact({
            subjectLastLogDate: null,
            lastTopicLogDate: null,
            studentFirstLogDate: dateAgo(3),
          }),
        ],
        t,
        TODAY,
      ),
    ).toEqual([]);
    // Öğrencinin hiç kaydı yoksa ihmal uyarısı üretilmez.
    expect(
      evaluateTopicAlerts(
        [fact({ subjectLastLogDate: null, lastTopicLogDate: null, studentFirstLogDate: null })],
        t,
        TODAY,
      ),
    ).toEqual([]);
  });

  it("eşikler parametredir: ayar değişince sonuç değişir", () => {
    const facts = [fact({ questionsWindow: 25, correctWindow: 14 })];
    expect(evaluateTopicAlerts(facts, t, TODAY)[0]?.kind).toBe("low_accuracy");
    const strict = { ...t, knowledge_gap: { min_questions: 20, max_accuracy: 60 } };
    expect(evaluateTopicAlerts(facts, strict, TODAY)[0]?.kind).toBe("knowledge_gap");
    const loose = { ...t, low_accuracy: { min_questions: 30, max_accuracy: 60 } };
    expect(evaluateTopicAlerts(facts, loose, TODAY)).toEqual([]);
  });

  it("sıralama: tür önceliği, sonra gecikme", () => {
    const alerts = evaluateTopicAlerts(
      [
        fact({ topicId: "a", topicSortOrder: 3, isNextTopic: true }),
        fact({ topicId: "b", topicSortOrder: 2, status: "studying", statusChangedAt: ago(50) }),
        fact({ topicId: "c", topicSortOrder: 1, status: "needs_review", statusChangedAt: ago(70) }),
        fact({ topicId: "d", topicSortOrder: 4, questionsWindow: 40, correctWindow: 10 }),
      ],
      t,
      TODAY,
    );
    expect(alerts.map((a) => a.topicId)).toEqual(["d", "c", "b", "a"]);
  });
});

describe("groupAlerts", () => {
  it("türleri dört gruba ayırır", () => {
    const alerts = evaluateTopicAlerts(
      [
        fact({ topicId: "a", questionsWindow: 40, correctWindow: 10 }),
        fact({ topicId: "b", topicSortOrder: 2, status: "studying", statusChangedAt: ago(50) }),
        fact({ topicId: "c", topicSortOrder: 3, isNextTopic: true }),
        fact({
          subjectId: "fen",
          subjectName: "Fen",
          topicId: "f1",
          subjectLastLogDate: dateAgo(20),
          lastTopicLogDate: null,
        }),
      ],
      t,
      TODAY,
    );
    const g = groupAlerts(alerts);
    expect(g.weak.map((a) => a.topicId)).toEqual(["a"]);
    expect(g.maintenance.map((a) => a.topicId)).toEqual(["b"]);
    expect(g.notStarted.map((a) => a.topicId)).toEqual(["c"]);
    expect(g.subjects.map((a) => a.subject.id)).toEqual(["fen"]);
  });
});

describe("pickStudentNudge / nudgeText", () => {
  it("başarı türlerini öğrenciye göstermez; bakım > başlanmamış", () => {
    const alerts = evaluateTopicAlerts(
      [
        fact({ topicId: "a", questionsWindow: 40, correctWindow: 10 }),
        fact({ topicId: "b", topicName: "Olasılık", topicSortOrder: 2, isNextTopic: true }),
        fact({
          topicId: "c",
          topicName: "Kareköklü İfadeler",
          topicSortOrder: 3,
          status: "completed",
          completedAt: ago(40),
          lastTopicLogDate: dateAgo(25),
        }),
      ],
      t,
      TODAY,
    );
    const pick = pickStudentNudge(alerts);
    expect(pick?.kind).toBe("forgetting_risk");
    expect(nudgeText(pick!)).toEqual({
      title: "Kareköklü İfadeler konusuna bir göz atma zamanı.",
      body: `25${NBSP}gündür bakmadın.`,
    });
    expect(pickStudentNudge(alerts.filter((a) => a.kind === "knowledge_gap"))).toBeNull();
    const onlyNext = alerts.filter((a) => a.kind === "not_started");
    expect(nudgeText(pickStudentNudge(onlyNext)!)).toEqual({
      title: "Sırada Olasılık var.",
      body: "İstersen bugün başla.",
    });
  });
});
