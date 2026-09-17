import { formatCount } from "@/lib/format";
import type { QuestionLogRow } from "../types";

/**
 * Kayıt satırı özeti: "20 soru · 15 D / 4 Y / 1 B · 35 dk". Sayı ile harf/birim arasında NBSP
 * (04 §12.1); satır yalnızca " / " ve " · " ayraçlarında kırılabilir.
 */
export function formatLogCounts(
  r: Pick<QuestionLogRow, "total" | "correct" | "wrong" | "blank" | "durationMinutes">,
): string {
  const parts = [
    formatCount(r.total, "soru"),
    `${formatCount(r.correct, "D")} / ${formatCount(r.wrong, "Y")} / ${formatCount(r.blank, "B")}`,
  ];
  if (r.durationMinutes) parts.push(formatCount(r.durationMinutes, "dk"));
  return parts.join(" · ");
}

/** Konu seçilmemiş kayıtta başlık; çağıran ink-500 ile gösterir. */
export const NO_TOPIC_LABEL = "Konu seçilmedi";
