/**
 * Net hesabı: doğru − yanlış / ceza. Ceza (kaç yanlış bir doğruyu götürür) şablonun
 * `scoring.wrong_penalty` değerinden gelir; 0 veya boş = ceza yok. Koda gömülü kural yok.
 */
export function calculateNet({
  correct,
  wrong,
  wrongPenalty,
}: {
  correct: number;
  wrong: number;
  wrongPenalty: number | null | undefined;
}): number {
  const penalty = wrongPenalty ?? 0;
  if (penalty <= 0) return correct;
  return correct - wrong / penalty;
}

/** Şablon `scoring` JSON'undan ceza değerini güvenle okur (yoksa 0). */
export function wrongPenaltyOf(scoring: unknown): number {
  if (typeof scoring !== "object" || scoring === null) return 0;
  const value = (scoring as { wrong_penalty?: unknown }).wrong_penalty;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/** Başarı yüzdesi (0-100, tam sayı); soru yoksa null. */
export function accuracyPercent(correct: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((correct / total) * 100);
}
