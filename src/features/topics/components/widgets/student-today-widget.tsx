import Link from "next/link";
import { LayoutGridIcon } from "lucide-react";
import { formatCount, formatPercent } from "@/lib/format";
import type { ModuleWidgetProps } from "@/modules/define-module";
import { percentOf } from "../../lib/completion";
import { getTopicCompletionSummary } from "../../server/queries";

/**
 * Bugün kartı: tamamlanan konu sayısı (tamamlandı + oturdu) / toplam. Ders dışı metrik: ders
 * rengi yok (04 Bölüm 4.2). Sunucu bileşeni; şablon atanmamışsa kart çizilmez.
 */
export async function StudentTodayWidget({ studentId }: ModuleWidgetProps) {
  const summary = await getTopicCompletionSummary(studentId);
  if (!summary) return null;
  const pct = percentOf(summary.done, summary.total);

  return (
    <Link
      href="/student/topics"
      aria-label={`Konular: ${summary.done} / ${formatCount(summary.total, "konu")} tamamlandı`}
      className="flex clay-press items-center gap-4 rounded-card clay-md p-4"
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-md clay-well text-ink-700"
      >
        <LayoutGridIcon className="size-5" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-heading font-semibold text-ink-900">
          {summary.done} / {formatCount(summary.total, "konu")}
        </span>
        <span className="text-small text-ink-500">
          {summary.done === 0
            ? "Henüz tamamlanan konu yok. Haritayı aç."
            : `${formatPercent(pct)} tamamlandı · haritayı aç`}
        </span>
      </span>
    </Link>
  );
}
