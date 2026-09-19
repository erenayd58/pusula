import { netDeltas, trendSummary, type MockPoint } from "@/lib/exam/mock";
import { formatDateTr, formatNet, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Dört genel denemeden azken grafik yerine kart listesi (tarih sırasıyla): ad, tarih, toplam net,
 * değişim (nötr sayı, ders rengi yok). Özet cümle `trendSummary`.
 */
export function ResultCardList({ points }: { points: readonly MockPoint[] }) {
  const deltas = netDeltas(points);
  return (
    <div className="flex flex-col gap-3" data-testid="result-card-list">
      <p className="text-small text-ink-500">{trendSummary(points)}</p>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Deneme netleri">
        {points.map((p) => {
          const delta = deltas.get(p.resultId) ?? null;
          return (
            <li
              key={p.resultId}
              className={cn(
                "flex flex-col gap-1 rounded-sm border border-line bg-bg-paper px-4 py-3",
                "clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised",
              )}
            >
              <span className="truncate text-micro-lg text-ink-500">
                {`${formatDateTr(p.takenOn)} · ${p.title}`}
              </span>
              <span className="text-heading-lg font-semibold text-ink-900 tabular-nums">
                {formatNet(p.totalNet)}
              </span>
              <span className="text-micro-lg text-ink-700 tabular-nums">
                {delta === null ? "ilk deneme" : `önceki denemeye göre ${formatSigned(delta)}`}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
