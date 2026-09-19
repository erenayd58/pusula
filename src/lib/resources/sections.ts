/**
 * Kaynak testleri: toplu üretim ve ilerleme (11 §3.1). Saf; `features/*` import etmez.
 * Tanım: bitmiş test = öğrencinin o `section_id`'li en az bir soru kaydı; ilerleme = bitmiş / toplam.
 */

export type SectionDraft = {
  title: string;
  questionCount: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  sortOrder: number;
  subjectId: string | null;
};

/** Tek partide üretilebilecek en fazla test; kitap başına toplam sınır 400 (RPC). */
export const MAX_SECTIONS_PER_BATCH = 200;

/**
 * "Test 1 – 40, her biri 20 soru" → 40 satır. `pageStart` ve `pagesPerSection` birlikte doluysa
 * i. testin sayfa aralığı `[start + i·n, start + (i+1)·n − 1]`. `to < from`, `from < 1` ya da
 * parti 200'den büyükse boş dizi (form zaten engeller).
 */
export function generateSections(input: {
  prefix: string;
  from: number;
  to: number;
  questionCount: number | null;
  pageStart: number | null;
  pagesPerSection: number | null;
  startSortOrder: number;
  subjectId: string | null;
}): SectionDraft[] {
  const { from, to, questionCount, pageStart, pagesPerSection, startSortOrder, subjectId } = input;
  const prefix = input.prefix.trim() || "Test";
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) return [];
  const count = to - from + 1;
  if (count > MAX_SECTIONS_PER_BATCH) return [];
  const paged =
    pageStart !== null && pagesPerSection !== null && pageStart >= 1 && pagesPerSection >= 1;
  const rows: SectionDraft[] = [];
  for (let i = 0; i < count; i += 1) {
    rows.push({
      title: `${prefix} ${from + i}`,
      questionCount,
      pageStart: paged ? pageStart + i * pagesPerSection : null,
      pageEnd: paged ? pageStart + (i + 1) * pagesPerSection - 1 : null,
      sortOrder: startSortOrder + i,
      subjectId,
    });
  }
  return rows;
}

/** İlerleme: bitmiş / toplam (yüzde yuvarlanır; test yoksa null). */
export function resourceProgress(
  sections: readonly { id: string; questionCount: number | null }[],
  doneIds: ReadonlySet<string>,
): { total: number; done: number; percent: number | null; questionsTotal: number } {
  const total = sections.length;
  let done = 0;
  let questionsTotal = 0;
  for (const s of sections) {
    if (doneIds.has(s.id)) done += 1;
    questionsTotal += s.questionCount ?? 0;
  }
  return {
    total,
    done,
    percent: total === 0 ? null : Math.round((done / total) * 100),
    questionsTotal,
  };
}
