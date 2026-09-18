import Link from "next/link";
import { LayoutGridIcon } from "lucide-react";
import { ProgressBar } from "@/components/shared/progress-bar";
import { formatCount, formatPercent } from "@/lib/format";
import { paceSentence } from "@/lib/strategy/pace";
import type { ModuleWidgetProps } from "@/modules/define-module";
import { percentOf } from "../../lib/completion";
import { getStudentPaceSummary } from "../../server/queries";

/**
 * Bugün kartı: tamamlanan konu sayısı (tamamlandı + oturdu) / toplam. Faz 5b (karar B7): hedef
 * varsa ikinci satır gidişat cümlesi ("sen", yargı yok) ve ince çubuk (doluluk done/total, çentik
 * takvime göre beklenen). Uyarı rengi yok; fosforlu yalnızca tüm konular bitince. Ders dışı
 * metrik: ders rengi yok (04 Bölüm 4.2). Sunucu bileşeni; şablon atanmamışsa kart çizilmez.
 */
export async function StudentTodayWidget({ studentId }: ModuleWidgetProps) {
  const summary = await getStudentPaceSummary(studentId);
  if (!summary) return null;
  const { pace, hasTargets } = summary;
  const pct = percentOf(pace.done, pace.total);
  const expectedPct = percentOf(pace.expectedByToday, pace.total);

  return (
    <Link
      href="/student/topics"
      aria-label={`Konular: ${pace.done} / ${formatCount(pace.total, "konu")} tamamlandı`}
      data-testid="topic-pace-card"
      className="flex clay-press flex-col gap-3 rounded-card clay-md p-4"
    >
      <span className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-md clay-well text-ink-700"
        >
          <LayoutGridIcon className="size-5" />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-heading font-semibold text-ink-900">
            {pace.done} / {formatCount(pace.total, "konu")}
          </span>
          <span className="text-small text-ink-500">
            {hasTargets
              ? paceSentence(pace, true)
              : pace.done === 0
                ? "Henüz tamamlanan konu yok. Haritayı aç."
                : `${formatPercent(pct)} tamamlandı · haritayı aç`}
          </span>
        </span>
      </span>
      {hasTargets ? (
        <ProgressBar
          percent={pct}
          marker={expectedPct}
          reached={pace.total > 0 && pace.done === pace.total}
          label={`Konu takvimi: ${formatPercent(pct)} bitti, takvime göre beklenen ${formatPercent(expectedPct)}`}
        />
      ) : null}
    </Link>
  );
}
