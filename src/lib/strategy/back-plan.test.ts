import { describe, expect, it } from "vitest";
import { backPlanTopics, type BackPlanTopic } from "./back-plan";

const t = (
  topicId: string,
  subjectId: string,
  subjectSortOrder: number,
  topicSortOrder: number,
  over: Partial<BackPlanTopic> = {},
): BackPlanTopic => ({
  topicId,
  subjectId,
  subjectSortOrder,
  topicSortOrder,
  schoolFinishOn: null,
  done: false,
  completedAt: null,
  ...over,
});

describe("backPlanTopics", () => {
  it("dersler arası sıra-sıra: Türkçe 1, Mat 1, Türkçe 2, Mat 2 …", () => {
    const out = backPlanTopics({
      topics: [
        t("m2", "mat", 2, 2),
        t("t1", "tr", 1, 1),
        t("m1", "mat", 2, 1),
        t("t2", "tr", 1, 2),
      ],
      startsOn: "2026-09-14",
      finishBy: "2026-09-22", // 8 gün, 4 konu → 2, 4, 6, 8. gün
    });
    expect(out).toEqual([
      { topicId: "t1", targetOn: "2026-09-16" },
      { topicId: "m1", targetOn: "2026-09-18" },
      { topicId: "t2", targetOn: "2026-09-20" },
      { topicId: "m2", targetOn: "2026-09-22" },
    ]);
  });

  it("okul tarihi dolu konular tarih sırasıyla önce gelir", () => {
    const out = backPlanTopics({
      topics: [
        t("t1", "tr", 1, 1),
        t("m1", "mat", 2, 1, { schoolFinishOn: "2026-09-10" }),
        t("f1", "fen", 3, 1, { schoolFinishOn: "2026-09-07" }),
      ],
      startsOn: "2026-09-14",
      finishBy: "2026-09-17", // 3 gün, 3 konu → 1, 2, 3. gün (okul tarihleri geçmiş, kelepçe yok)
    });
    expect(out.map((o) => o.topicId)).toEqual(["f1", "m1", "t1"]);
    expect(out.map((o) => o.targetOn)).toEqual(["2026-09-15", "2026-09-16", "2026-09-17"]);
  });

  it("bitmiş konu sıradaki yuvasını alır; hedefi completedAt günü (aralığa kırpılır), yoksa yuva", () => {
    const out = backPlanTopics({
      topics: [
        t("t1", "tr", 1, 1, { done: true, completedAt: "2026-09-15T20:30:00+03:00" }),
        t("t2", "tr", 1, 2, { done: true, completedAt: "2026-09-01T10:00:00+03:00" }), // başlangıçtan önce
        t("t3", "tr", 1, 3, { done: true }), // completedAt yok → yuva
        t("t4", "tr", 1, 4),
      ],
      startsOn: "2026-09-14",
      finishBy: "2026-09-22", // 8 gün, 4 konu → 2, 4, 6, 8. gün
    });
    expect(out).toEqual([
      { topicId: "t1", targetOn: "2026-09-15" },
      { topicId: "t2", targetOn: "2026-09-14" },
      { topicId: "t3", targetOn: "2026-09-20" },
      { topicId: "t4", targetOn: "2026-09-22" }, // bitmişler yuva tükettiği için son yuva
    ]);
    // completedAt UTC gece yarısı sınırı İstanbul gününe göre okunur (21:30Z = ertesi gün 00:30 İstanbul).
    const edge = backPlanTopics({
      topics: [t("a", "s", 1, 1, { done: true, completedAt: "2026-09-15T21:30:00Z" })],
      startsOn: "2026-09-14",
      finishBy: "2026-09-30",
    });
    expect(edge).toEqual([{ topicId: "a", targetOn: "2026-09-16" }]);
  });

  it("okul kelepçesi: hedef okul tarihinden önce olamaz; finishBy ile sınırlı; diğerleri değişmez", () => {
    const out = backPlanTopics({
      topics: [
        t("f1", "fen", 3, 1, { schoolFinishOn: "2026-10-05" }),
        t("m1", "mat", 2, 1, { schoolFinishOn: "2026-12-07" }),
        t("t1", "tr", 1, 1),
        t("t2", "tr", 1, 2),
      ],
      startsOn: "2026-09-14",
      finishBy: "2026-11-09", // 56 gün, 4 konu → 14, 28, 42, 56. gün
    });
    expect(out).toEqual([
      { topicId: "f1", targetOn: "2026-10-05" }, // yayılım 28 Eyl → okul haftasına itildi
      { topicId: "m1", targetOn: "2026-11-09" }, // okul bitişten sonra → finishBy
      { topicId: "t1", targetOn: "2026-10-26" },
      { topicId: "t2", targetOn: "2026-11-09" },
    ]);
  });

  it("eşit yayılım uçları: son konu bitiş günü; tek konu bitişe; 0 günlük aralıkta hepsi aynı gün", () => {
    const one = backPlanTopics({
      topics: [t("a", "s", 1, 1)],
      startsOn: "2026-09-14",
      finishBy: "2026-12-31",
    });
    expect(one).toEqual([{ topicId: "a", targetOn: "2026-12-31" }]);
    const many = backPlanTopics({
      topics: Array.from({ length: 10 }, (_, i) => t(`a${i}`, "s", 1, i)),
      startsOn: "2026-09-14",
      finishBy: "2026-09-17",
    });
    expect(many.at(-1)?.targetOn).toBe("2026-09-17");
    expect(many[0]?.targetOn).toBe("2026-09-14"); // floor(3/10) = 0
    const same = backPlanTopics({
      topics: [t("a", "s", 1, 1), t("b", "s", 1, 2)],
      startsOn: "2026-09-14",
      finishBy: "2026-09-14",
    });
    expect(same.map((o) => o.targetOn)).toEqual(["2026-09-14", "2026-09-14"]);
  });

  it("bitiş başlangıçtan önce ya da konu yoksa boş dizi", () => {
    expect(
      backPlanTopics({
        topics: [t("a", "s", 1, 1)],
        startsOn: "2026-09-14",
        finishBy: "2026-09-13",
      }),
    ).toEqual([]);
    expect(backPlanTopics({ topics: [], startsOn: "2026-09-14", finishBy: "2026-10-14" })).toEqual(
      [],
    );
  });
});
