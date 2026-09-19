import { formatPercent } from "@/lib/format";
import type { MistakeReason } from "@/types";

/** Neden → koç cümlesindeki ad hali ("Yanlışların %38'i bilgi eksiği"). */
const REASON_PHRASE: Record<Exclude<MistakeReason, "unknown">, string> = {
  knowledge_gap: "bilgi eksiği",
  attention: "dikkat hatası",
  time: "süre yetersizliği",
  misread_question: "soru kökünü yanlış okuma",
  calculation: "işlem hatası",
};

export type ReasonSlice = { reason: MistakeReason; count: number; percent: number };

/**
 * Hata nedeni dağılımı (10 §3.1): sayıya göre azalan (eşitlikte ilk görülen önce); yüzdeler en
 * büyük kalan yöntemiyle toplam 100'e tamamlanır. Boş → []. Yalnızca görülen nedenler listelenir.
 */
export function reasonDistribution(rows: readonly { reason: MistakeReason }[]): ReasonSlice[] {
  const counts = new Map<MistakeReason, number>();
  for (const r of rows) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
  const total = rows.length;
  if (total === 0) return [];
  const slices = [...counts]
    .map(([reason, count]) => ({ reason, count, exact: (count * 100) / total }))
    .sort((a, b) => b.count - a.count);
  const out = slices.map((s) => ({
    reason: s.reason,
    count: s.count,
    percent: Math.floor(s.exact),
  }));
  let remainder = 100 - out.reduce((a, s) => a + s.percent, 0);
  const order = slices
    .map((s, i) => ({ i, frac: s.exact - Math.floor(s.exact) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    out[i]!.percent++;
    remainder--;
  }
  return out;
}

/**
 * Baskın neden cümlesi: "Yanlışların %38'i bilgi eksiği". En büyük dilim `unknown` ise ya da dağılım
 * boşsa null (koç ekranı yalnızca sayıları gösterir).
 */
export function dominantReasonSentence(dist: readonly ReasonSlice[]): string | null {
  const top = dist[0];
  if (!top || top.reason === "unknown") return null;
  return `Yanlışların ${formatPercent(top.percent)}'i ${REASON_PHRASE[top.reason]}`;
}
