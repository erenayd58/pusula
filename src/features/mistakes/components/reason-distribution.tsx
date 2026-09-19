import { mistakeReasonLabels } from "@/content/labels";
import { formatCount, formatPercent } from "@/lib/format";
import type { ReasonDistribution as Distribution } from "../types";

/**
 * Koç: hata nedeni dağılımı — yatay `ink-900` çubuklar + sayı · yüzde, altta cümle
 * "Yanlışların %38'i bilgi eksiği · 21 kayıt, son 60 gün" (10 §3.4; ders rengi yok, çubuk
 * genişliği hesap değerinden). Kayıt yoksa nötr not.
 */
export function ReasonDistribution({ distribution }: { distribution: Distribution }) {
  const { slices, total, lookbackDays, sentence } = distribution;
  const max = Math.max(1, ...slices.map((s) => s.count));
  return (
    <section
      className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4"
      aria-labelledby="reason-distribution-heading"
      data-testid="reason-distribution"
    >
      <h2 id="reason-distribution-heading" className="text-heading font-semibold text-ink-900">
        Hata nedeni dağılımı
      </h2>
      {total === 0 ? (
        <p className="text-small text-ink-500">
          {`Son ${formatCount(lookbackDays, "gün")}de defter kaydı yok.`}
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {slices.map((s) => (
              <li key={s.reason} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-small">
                <span className="truncate text-ink-700">{mistakeReasonLabels[s.reason]}</span>
                <span className="h-2 overflow-hidden rounded-pill bg-bg-sunken">
                  <span
                    className="block h-full rounded-pill bg-ink-900"
                    style={{ width: `${(s.count / max) * 100}%` }}
                  />
                </span>
                <span className="text-ink-900 tabular-nums">
                  {`${formatCount(s.count)} · ${formatPercent(s.percent)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-small text-ink-700">
            {[sentence, `${formatCount(total, "kayıt")}, son ${formatCount(lookbackDays, "gün")}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </>
      )}
    </section>
  );
}
