/**
 * Toplam soru hedefini derslere dağıtır (09 §2 Parça 2): sınav soru sayısına orantılı, en büyük
 * kalan yöntemi; toplam tam `total`; ağırlığı olmayan (null/0) ders 0. Saf.
 */
export function splitQuestions(
  total: number,
  subjects: readonly { subjectId: string; examQuestionCount: number | null }[],
): { subjectId: string; questions: number }[] {
  const safeTotal = Math.max(0, Math.floor(total));
  const weights = subjects.map((s) => Math.max(0, s.examQuestionCount ?? 0));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum === 0 || safeTotal === 0) {
    return subjects.map((s) => ({ subjectId: s.subjectId, questions: 0 }));
  }
  const exact = weights.map((w) => (safeTotal * w) / weightSum);
  const base = exact.map((v) => Math.floor(v));
  let remainder = safeTotal - base.reduce((a, b) => a + b, 0);
  // En büyük kalan: kesir payı büyükten küçüğe (eşitlikte dizi sırası).
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    if (weights[i]! > 0) {
      base[i]!++;
      remainder--;
    }
  }
  return subjects.map((s, i) => ({ subjectId: s.subjectId, questions: base[i]! }));
}
