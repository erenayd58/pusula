import { describe, expect, it } from "vitest";
import { generateSections, resourceProgress } from "./sections";

const base = {
  prefix: "Test",
  questionCount: 20,
  pageStart: null,
  pagesPerSection: null,
  startSortOrder: 0,
  subjectId: null,
};

describe("generateSections", () => {
  it("Test 1–3, 20 soru → üç satır sıralı", () => {
    expect(generateSections({ ...base, from: 1, to: 3 })).toEqual([
      {
        title: "Test 1",
        questionCount: 20,
        pageStart: null,
        pageEnd: null,
        sortOrder: 0,
        subjectId: null,
      },
      {
        title: "Test 2",
        questionCount: 20,
        pageStart: null,
        pageEnd: null,
        sortOrder: 1,
        subjectId: null,
      },
      {
        title: "Test 3",
        questionCount: 20,
        pageStart: null,
        pageEnd: null,
        sortOrder: 2,
        subjectId: null,
      },
    ]);
  });

  it("sayfa başlangıcı + test başına sayfa → ardışık aralıklar; sıra mevcut testlerin ardından", () => {
    const rows = generateSections({
      ...base,
      from: 5,
      to: 6,
      pageStart: 10,
      pagesPerSection: 4,
      startSortOrder: 4,
      subjectId: "s1",
    });
    expect(rows.map((r) => [r.title, r.pageStart, r.pageEnd, r.sortOrder, r.subjectId])).toEqual([
      ["Test 5", 10, 13, 4, "s1"],
      ["Test 6", 14, 17, 5, "s1"],
    ]);
  });

  it("boş önek 'Test' olur, boşluklar kırpılır", () => {
    expect(generateSections({ ...base, prefix: "  Ünite ", from: 2, to: 2 })[0]?.title).toBe(
      "Ünite 2",
    );
    expect(generateSections({ ...base, prefix: "  ", from: 1, to: 1 })[0]?.title).toBe("Test 1");
  });

  it("geçersiz aralık ya da 200'den büyük parti → boş", () => {
    expect(generateSections({ ...base, from: 3, to: 2 })).toEqual([]);
    expect(generateSections({ ...base, from: 0, to: 2 })).toEqual([]);
    expect(generateSections({ ...base, from: 1, to: 201 })).toEqual([]);
    expect(generateSections({ ...base, from: 1, to: 200 })).toHaveLength(200);
  });
});

describe("resourceProgress", () => {
  const sections = [
    { id: "a", questionCount: 20 },
    { id: "b", questionCount: 20 },
    { id: "c", questionCount: null },
  ];

  it("bitmiş / toplam, yüzde yuvarlanır, soru toplamı boşları 0 sayar", () => {
    expect(resourceProgress(sections, new Set(["a"]))).toEqual({
      total: 3,
      done: 1,
      percent: 33,
      questionsTotal: 40,
    });
    expect(resourceProgress(sections, new Set(["a", "b", "c"])).percent).toBe(100);
  });

  it("test yoksa yüzde null", () => {
    expect(resourceProgress([], new Set())).toEqual({
      total: 0,
      done: 0,
      percent: null,
      questionsTotal: 0,
    });
  });

  it("listede olmayan bitmiş kimlikler sayılmaz", () => {
    expect(resourceProgress(sections, new Set(["zzz"])).done).toBe(0);
  });
});
