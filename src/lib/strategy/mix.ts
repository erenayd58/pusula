import type { TopicAlertKind } from "@/types";
import type { PeriodMix } from "./periods";

/**
 * Dönem karışımı (09 §2 Parça 3): uyarı türleri üç kategoriye ayrılır, öğrenci başına öneri
 * kotası dönem yüzdelerine göre paylaştırılır. Saf; `features/*` import etmez.
 */
export type MixCategory = "new_topic" | "weak" | "review";

export const MIX_CATEGORIES: readonly MixCategory[] = ["new_topic", "weak", "review"];

const CATEGORY_OF: Record<TopicAlertKind, MixCategory> = {
  not_started: "new_topic",
  behind_school: "new_topic",
  knowledge_gap: "weak",
  low_accuracy: "weak",
  mock_weak: "weak",
  neglected_subject: "weak",
  review_due: "review",
  forgetting_risk: "review",
  stale: "review",
};

/** new_topic: not_started, behind_school · weak: knowledge_gap, low_accuracy, mock_weak, neglected_subject · review: kalanlar. */
export function mixCategoryOf(kind: TopicAlertKind): MixCategory {
  return CATEGORY_OF[kind];
}

/**
 * `max` yuvayı yüzdelere göre paylaştırır (en büyük kalan yöntemi; toplam = max). Yüzdeler
 * toplamına göre normalize edilir; toplam 0 ise her kota 0 (çağıran kalan yuvaları puana göre
 * doldurur). Kalan eşitliğinde kategori sırası (yeni, zayıf, bakım) kazanır.
 */
export function allocateByMix(max: number, mix: PeriodMix): Record<MixCategory, number> {
  const out: Record<MixCategory, number> = { new_topic: 0, weak: 0, review: 0 };
  const total = MIX_CATEGORIES.reduce((sum, c) => sum + Math.max(0, mix[c]), 0);
  const slots = Math.max(0, Math.floor(max));
  if (total <= 0 || slots === 0) return out;

  const remainders: { category: MixCategory; remainder: number }[] = [];
  let used = 0;
  for (const c of MIX_CATEGORIES) {
    const exact = (slots * Math.max(0, mix[c])) / total;
    const floor = Math.floor(exact);
    out[c] = floor;
    used += floor;
    remainders.push({ category: c, remainder: exact - floor });
  }
  remainders.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; used < slots && i < remainders.length; i++, used++)
    out[remainders[i]!.category]++;
  return out;
}
