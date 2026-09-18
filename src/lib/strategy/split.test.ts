import { describe, expect, it } from "vitest";
import { splitQuestions } from "./split";

const LGS = [
  { subjectId: "tr", examQuestionCount: 20 },
  { subjectId: "mat", examQuestionCount: 20 },
  { subjectId: "fen", examQuestionCount: 20 },
  { subjectId: "ink", examQuestionCount: 10 },
  { subjectId: "din", examQuestionCount: 10 },
  { subjectId: "ing", examQuestionCount: 10 },
];

describe("splitQuestions", () => {
  it("sınav soru sayısına orantılı; toplam tam total", () => {
    const out = splitQuestions(9000, LGS);
    expect(out.map((o) => o.questions)).toEqual([2000, 2000, 2000, 1000, 1000, 1000]);
    expect(out.reduce((s, o) => s + o.questions, 0)).toBe(9000);
  });

  it("en büyük kalan yöntemi: artan sorular kesri en büyük derslere", () => {
    // 100 × 20/90 = 22,22 (×3), 100 × 10/90 = 11,11 (×3) → taban 99, kalan 1 → ilk 20'lik derse.
    const out = splitQuestions(100, LGS);
    expect(out.map((o) => o.questions)).toEqual([23, 22, 22, 11, 11, 11]);
    expect(out.reduce((s, o) => s + o.questions, 0)).toBe(100);
    // 1000 × 1/3 = 333,33 (×3) → 999 + 1 → 334, 333, 333.
    const three = splitQuestions(1000, [
      { subjectId: "a", examQuestionCount: 5 },
      { subjectId: "b", examQuestionCount: 5 },
      { subjectId: "c", examQuestionCount: 5 },
    ]);
    expect(three.map((o) => o.questions)).toEqual([334, 333, 333]);
  });

  it("ağırlığı olmayan ders 0 alır; ağırlık hiç yoksa hepsi 0; total 0 → hepsi 0", () => {
    const out = splitQuestions(10, [
      { subjectId: "a", examQuestionCount: 1 },
      { subjectId: "b", examQuestionCount: null },
      { subjectId: "c", examQuestionCount: 0 },
    ]);
    expect(out.map((o) => o.questions)).toEqual([10, 0, 0]);
    expect(
      splitQuestions(10, [
        { subjectId: "a", examQuestionCount: null },
        { subjectId: "b", examQuestionCount: null },
      ]).map((o) => o.questions),
    ).toEqual([0, 0]);
    expect(splitQuestions(0, LGS).every((o) => o.questions === 0)).toBe(true);
  });
});
