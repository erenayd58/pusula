import { formatNet } from "@/lib/format";

/**
 * Deneme hesapları (10-faz6-denemeler.md §3.1). Tanımlar tek yerde: **genel deneme** = branş dersi
 * boş; **toplam net** yalnızca genel denemede; **değişim** = önceki genel denemeye göre; **son N** =
 * tarih sırasıyla son N genel deneme (ders istatistiğinde o dersin branşı da sayılır); **işaret** =
 * `mock_exam_topic_mistakes` satırı (sayı yok). Yapısal tipler; `features/*` import edilmez.
 * `points` her zaman tarih sırasıyla (eskiden yeniye) verilir.
 */
export type SubjectNet = {
  subjectId: string;
  correct: number;
  wrong: number;
  blank: number;
  net: number;
  questionCount: number | null;
};

export type MockPoint = {
  resultId: string;
  title: string;
  takenOn: string;
  isBranch: boolean;
  totalNet: number;
  subjects: SubjectNet[];
};

/** Boş otomatik (karar C4): `count − c − w`; ders soru sayısı yoksa ya da sonuç negatifse null. */
export function autoBlank(
  questionCount: number | null,
  correct: number,
  wrong: number,
): number | null {
  if (questionCount === null) return null;
  const blank = questionCount - correct - wrong;
  return blank < 0 ? null : blank;
}

/** Σ ders neti, iki basamağa yuvarlanmış. */
export function totalNet(subjects: readonly SubjectNet[]): number {
  const sum = subjects.reduce((acc, s) => acc + s.net, 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Sonuç → önceki genel denemeye göre değişim. İlk genel deneme ve branş denemeleri → null.
 */
export function netDeltas(points: readonly MockPoint[]): Map<string, number | null> {
  const out = new Map<string, number | null>();
  let prev: number | null = null;
  for (const p of points) {
    if (p.isBranch) {
      out.set(p.resultId, null);
      continue;
    }
    out.set(p.resultId, prev === null ? null : Math.round((p.totalNet - prev) * 100) / 100);
    prev = p.totalNet;
  }
  return out;
}

const COUNT_WORDS = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz", "On"];

/**
 * Grafik özet cümlesi (04 §13): "Beş denemede toplam net 13,00 arttı." · "… 2,33 düştü." ·
 * "… değişmedi." · tek deneme: "Bir deneme girildi." · hiç: "Henüz deneme yok."
 * Yalnızca genel denemeler sayılır.
 */
export function trendSummary(points: readonly MockPoint[]): string {
  const general = points.filter((p) => !p.isBranch);
  if (general.length === 0) return "Henüz deneme yok.";
  if (general.length === 1) return "Bir deneme girildi.";
  const first = general[0]!;
  const last = general[general.length - 1]!;
  const diff = Math.round((last.totalNet - first.totalNet) * 100) / 100;
  const count = COUNT_WORDS[general.length] ?? String(general.length);
  if (diff === 0) return `${count} denemede toplam net değişmedi.`;
  return `${count} denemede toplam net ${formatNet(Math.abs(diff))} ${diff > 0 ? "arttı" : "düştü"}.`;
}

/**
 * Konu işaret sayımı: yalnızca `recentResultIds` içindeki sonuçların işaretleri; azalan sayı,
 * eşitlikte topicId.
 */
export function topicMarkCounts(
  marks: readonly { resultId: string; topicId: string }[],
  recentResultIds: ReadonlySet<string>,
): { topicId: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of marks) {
    if (!recentResultIds.has(m.resultId)) continue;
    counts.set(m.topicId, (counts.get(m.topicId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([topicId, count]) => ({ topicId, count }))
    .sort((a, b) => b.count - a.count || a.topicId.localeCompare(b.topicId));
}

/**
 * Ders başına son `n` denemedeki yanlış toplamı ve deneme sayısı. Dersin penceresi: genel denemeler
 * + o dersin branş denemeleri (tarih sırasıyla son n). Satırı olmayan ders çıktıda yer almaz.
 */
export function recentSubjectWrong(
  points: readonly MockPoint[],
  n: number,
): Map<string, { wrong: number; exams: number }> {
  const out = new Map<string, { wrong: number; exams: number }>();
  if (n <= 0) return out;
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]!;
    for (const s of p.subjects) {
      const cur = out.get(s.subjectId) ?? { wrong: 0, exams: 0 };
      if (cur.exams >= n) continue;
      out.set(s.subjectId, { wrong: cur.wrong + s.wrong, exams: cur.exams + 1 });
    }
  }
  return out;
}
