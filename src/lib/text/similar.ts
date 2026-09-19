/**
 * Benzer ad önerisi (11 §3.1): kaynak/liste eklerken "Bunu mu demek istedin?" kutusu için.
 * Saf; küçük kataloglarda (onlarca satır) istemcide çalışır, veritabanı eklentisi gerekmez.
 */

/** Ad alanında anlam taşımayan dolgu sözcükler (yayınevi ekleri). */
const FILLER = new Set([
  "yayınları",
  "yayinlari",
  "yayınevi",
  "yayinevi",
  "yay",
  "yayıncılık",
  "yayincilik",
]);

/** Türkçe küçük harf (İ → i, I → ı), noktalama → boşluk, çoklu boşluk tek, dolgu sözcükler atılır. */
export function normalizeTitle(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((t) => t.length > 0 && !FILLER.has(t))
    .join(" ");
}

function tokensOf(normalized: string): string[] {
  return normalized.length === 0 ? [] : normalized.split(" ");
}

/**
 * Sorguya benzeyen adayları puanla sıralar. Puan = eşleşen sözcük / birleşim sözcük sayısı
 * (son sorgu sözcüğü yazılmakta olabilir: bir aday sözcüğünün öneki ise eşleşir) + adayın adı
 * sorguyla başlıyorsa 0,3. Sorgu 3 karakterden kısaysa []. Varsayılan en fazla 3 öneri, eşik 0,34.
 */
export function similarTitles<T extends { title: string }>(
  query: string,
  candidates: readonly T[],
  opts: { limit?: number; minScore?: number } = {},
): T[] {
  const limit = opts.limit ?? 3;
  const minScore = opts.minScore ?? 0.34;
  const q = normalizeTitle(query);
  if (q.length < 3) return [];
  const qTokens = tokensOf(q);
  const last = qTokens[qTokens.length - 1];

  const scored = candidates
    .map((c) => {
      const cn = normalizeTitle(c.title);
      const cTokens = tokensOf(cn);
      if (cTokens.length === 0) return { c, score: 0 };
      const cSet = new Set(cTokens);
      let matched = 0;
      for (const t of qTokens) {
        if (cSet.has(t)) matched += 1;
        else if (t === last && cTokens.some((ct) => ct.startsWith(t))) matched += 1;
      }
      const union = new Set([...qTokens, ...cTokens]).size;
      let score = union === 0 ? 0 : matched / union;
      if (cn.startsWith(q)) score += 0.3;
      return { c, score };
    })
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score || a.c.title.localeCompare(b.c.title, "tr-TR"));

  return scored.slice(0, limit).map((x) => x.c);
}
