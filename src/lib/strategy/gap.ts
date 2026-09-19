/**
 * Ders açığının deneme bileşeni ve birleşimi (10 §3.3, karar C12). Saf; `features/*` import etmez.
 * `subjectGap` (0–1) = (1 − w) × soruAçığı + w × denemeAçığı; veri olmayan bileşen ağırlığını
 * diğerine bırakır.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Deneme açığı (mutlak): 1 − ortalama net / dersin sınav soru sayısı, 0–1'e kırpılır. Soru sayısı
 * yoksa ya da 0 ise undefined (bileşen yok).
 */
export function mockSubjectGap(input: {
  avgNet: number;
  questionCount: number | null;
}): number | undefined {
  if (input.questionCount === null || input.questionCount <= 0) return undefined;
  return clamp01(1 - input.avgNet / input.questionCount);
}

/**
 * İki bileşenin ağırlıklı birleşimi: ikisi varsa (1 − w) × soru + w × deneme; yalnızca biri varsa
 * o (ağırlık diğerine kalır); ikisi de yoksa undefined. `weight` 0–1'e kırpılır.
 */
export function combineGap(input: {
  questionGap?: number;
  mockGap?: number;
  weight: number;
}): number | undefined {
  const w = clamp01(input.weight);
  const q = input.questionGap;
  const m = input.mockGap;
  if (q !== undefined && m !== undefined) return clamp01((1 - w) * q + w * m);
  if (q !== undefined) return clamp01(q);
  if (m !== undefined) return clamp01(m);
  return undefined;
}
